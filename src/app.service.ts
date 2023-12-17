import { Inject, Injectable } from '@nestjs/common';
import * as cron from 'node-cron';
import { ClickHouse } from 'clickhouse';
import { TemperaturaDto } from './dto/clickhouseDto';
import { MongoClient } from 'mongodb';
import { updateDepartamentDto } from './dto/updateDepartmentDto';
import { createLogDto } from './dto/createLogDto';
import { Client } from 'pg';

@Injectable()
export class AppService {
  private pgClient;

  constructor(
    @Inject('CLICKHOUSE') private readonly clickhouse: ClickHouse,
    @Inject('MONGO') private readonly mongo: MongoClient,
  ) {
    this.pgClient = new Client({
      user: 'flctctxl',
      host: 'motty.db.elephantsql.com',
      database: 'flctctxl',
      password: 'xYLEB0rM-KtcBX6W09CupSajlgaCIuas',
      port: 5432,
    });
    cron.schedule('55 13 10 * * *', () => {
      this.average();
    });
    setInterval(() => {
      this.setData();
    }, 3000);
  }

  getHello(): string {
    return 'Hello World!';
  }

  async read() {
    const query = `
      SELECT departamento, fecha AS ultima_medicion, temperatura
      FROM mediciones
      ORDER BY departamento, fecha DESC
      LIMIT 1 BY departamento
    `;
    const data = await this.clickhouse.query(query).toPromise();
    return JSON.stringify(data);
  }

  async average() {
    const today = new Date();
    const init = new Date(today.setHours(0, 0, 0, 0))
      .toLocaleString('en-CA', { hour12: false })
      .split(',');
    const fin = new Date(today.setHours(23, 59, 59, 999))
      .toLocaleString('en-CA', { hour12: false })
      .split(',');
    const query = `
      SELECT departamento, fecha, temperatura
      FROM mediciones
      WHERE fecha >= '${String(
        init[0] + ' ' + init[1].split(' ')[1].replace('24:', '00:'),
      )}' AND fecha <  '${String(fin[0] + ' ' + fin[1].split(' ')[1])}';
    `;
    const datosTemperatura = await this.clickhouse.query(query).toPromise();

    const datosPorHora = datosTemperatura.reduce(
      (acumulador, dato: TemperaturaDto) => {
        const hora = new Date(dato.fecha).getHours();
        const departamento = dato.departamento;
        if (!acumulador[hora]) acumulador[hora] = {};
        if (!acumulador[hora][departamento])
          acumulador[hora][departamento] = { total: 0, count: 0 };
        acumulador[hora][departamento].total += dato.temperatura;
        acumulador[hora][departamento].count += 1;
        return acumulador;
      },
      {},
    );

    const promediosPorHora = Object.keys(datosPorHora).map((hora) => {
      const departamento = Object.keys(datosPorHora[hora]);
      const promediosPorDepartamento = departamento.map((departamento) => {
        const promedio = (
          datosPorHora[hora][departamento].total /
          datosPorHora[hora][departamento].count
        ).toFixed(2);
        return { hora, departamento, promedio };
      });
      return promediosPorDepartamento;
    });

    try {
      await this.mongo.connect();
      // Send a ping to confirm a successful connection
      await this.mongo.db('admin').command({ ping: 1 });
      console.log(
        'Pinged your deployment. You successfully connected to MongoDB!',
      );

      for (const promediosPorDepartamento of promediosPorHora) {
        for (const promedio of promediosPorDepartamento) {
          const filter = {
            Departamento: promedio.departamento,
          };

          const update = {
            $push: {
              Mediciones: {
                Fecha: init[0],
                Hora: promedio.hora,
                Temperatura: promedio.promedio,
              },
            },
          };

          await this.mongo
            .db('monitoreo')
            .collection('Historial')
            .updateOne(filter, update, { upsert: true });
        }
      }
    } finally {
      // Ensures that the client will close when you finish/error
      await this.mongo.close();
      console.log('Closed connection to MongoDB');
    }
  }

  async setData() {
    let datos = getData();
    const query =
      'INSERT INTO mediciones (temperatura, departamento, fecha) VALUES';
    const values = datos
      .map(
        ({ temperatura, departamento, fecha }) =>
          `(${temperatura}, '${departamento}', '${fecha}')`,
      )
      .join(', ');
    await this.clickhouse.query(`${query} ${values}`).toPromise();
  }

  async createDepartaments() {
    const departamentoData = Array.from({ length: 120 }, (_, i) => {
      const TIdeal = getRandomDecimal(15, 20, 2).toFixed(2);
      const TMin = (parseFloat(TIdeal) - getRandomDecimal(0, 1, 2)).toFixed(2);
      const TMax = (parseFloat(TIdeal) + getRandomDecimal(0, 1, 2)).toFixed(2);

      return {
        Numero: String(i + 1),
        TIdeal: TIdeal,
        TMin: TMin,
        TMax: TMax,
      };
    });

    for (const departamento of departamentoData) {
      const filter = { Numero: departamento.Numero };

      const update = {
        $setOnInsert: {
          TMin: departamento.TMin,
          TMax: departamento.TMax,
          TIdeal: departamento.TIdeal,
          Logs: [], // Array de logs vacío
        },
      };

      this.updateDepartamentConnection(filter, update, { upsert: true });
    }
  }

  async updateDepartament(update: updateDepartamentDto) {
    const filter = { Numero: update.departamento };

    const updateQuery = {
      $set: {
        TIdeal: update.TIdeal,
        TMin: update.TMin,
        TMax: update.TMax,
      },
    };

    try {
      await this.mongo.connect();
      const db = this.mongo.db('monitoreo');
      const result = await db
        .collection('Departamento')
        .updateOne(filter, updateQuery);
      return JSON.stringify(result);
    } finally {
      await this.mongo.close();
    }
  }

  async createUser(user) {
    await this.pgClient.connect();
    const query = `
      INSERT INTO users (fullname, password, email)
      VALUES ('${user.username}', '${user.password}', '${user.email}')
    `;
    await this.pgClient.query(query);
    await this.pgClient.end();
  }

  async createLog(create: createLogDto) {
    const filter = { Numero: create.departamento };

    const updateQuery = {
      $push: {
        Logs: {
          Log: create.Log,
          Timestamp: create.timestamp,
          Visibility: true,
        },
      },
    };
    this.updateDepartamentConnection(filter, updateQuery, {});
  }

  async updateDepartamentConnection(filter, updateQuery, options) {
    try {
      await this.mongo.connect();
      const db = this.mongo.db('monitoreo');
      await db
        .collection('Departamento')
        .updateOne(filter, updateQuery, options);
    } finally {
      await this.mongo.close();
    }
  }
}

/*
let date = 1702600405734; // 2023-12-15T00:33:25.734Z
let datos1 = getData(new Date(date - 1*(3.6e6))); // los datos seran 2023-12-14T23:33:25.734Z

Los datos entregados son con respceto a date - 1 hora zona +3 con respecto a chile


datos2 = getData(); // Sin argumentos, el date sera el del momento en que se inicializa la variable
*/

function getData(
  fdate: Date = new Date(Date.now() - 3 * 3.6e6),
): Array<unknown> {
  let cont = 1;
  const datos = Array.from({ length: 120 }, () => ({
    departamento: String(cont++),
    temperatura: getRandomDecimal(15, 20, 2),
    fecha: fdate.getTime(), //fdate //new Date().toLocaleString(),
  }));
  return datos;
}

function getRandomDecimal(min, max, precision): number {
  const factor = Math.pow(10, precision);
  return Math.floor(Math.random() * (max - min + 1) * factor) / factor + min;
}
