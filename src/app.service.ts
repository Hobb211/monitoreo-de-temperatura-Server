import { Inject, Injectable } from '@nestjs/common';
import * as cron from 'node-cron';
import { ClickHouse } from 'clickhouse';
import { TemperaturaDto } from './dto/clickhouseDto';
import { MongoClient, ObjectId } from 'mongodb';
import { updateDepartamentDto } from './dto/updateDepartmentDto';
import { createLogDto } from './dto/createLogDto';
import { Departamento } from './dto/departmentDto';

@Injectable()
export class AppService {
  private deps;

  constructor(
    @Inject('CLICKHOUSE') private readonly clickhouse: ClickHouse,
    @Inject('MONGO') private readonly mongo: MongoClient,
  ) {
    this.openConnection();
    cron.schedule('55 9 21 * * *', () => {
      this.average();
    });
    setInterval(() => {
      this.setData();
    }, 30000);
  }

  getHello(): string {
    return 'Hello World!';
  }

  async openConnection() {
    this.deps = await this.mongo
      .db('monitoreo')
      .collection('Departamento')
      .find()
      .toArray();
  }

  async read() {
    const query = `
      SELECT departamento, fecha AS ultima_medicion, temperatura
      FROM mediciones
      ORDER BY departamento, fecha DESC
      LIMIT 1 BY departamento
    `;
    const data = await this.clickhouse.query(query).toPromise();
    data.forEach((value: TemperaturaDto) => {
      value.TMin = parseFloat(this.deps[parseInt(value.departamento) - 1].TMin);
      value.TMax = parseFloat(this.deps[parseInt(value.departamento) - 1].TMax);
      value.TIdeal = parseFloat(
        this.deps[parseInt(value.departamento) - 1].TIdeal,
      );
    });

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

    await this.clickhouse.query(`TRUNCATE TABLE mediciones`).toPromise();

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

    const promedios = [];

    for (const promediosPorDepartamento of promediosPorHora) {
      for (const promedio of promediosPorDepartamento) {
        promedios.push({
          updateOne: {
            filter: { departamento: promedio.departamento },
            update: {
              $push: {
                Mediciones: {
                  Fecha: init[0],
                  Hora: promedio.hora,
                  Temperatura: promedio.promedio,
                },
              },
            },
            upsert: true,
          },
        });
      }
    }

    try {
      await this.mongo.connect();
      await this.mongo
        .db('monitoreo')
        .collection('Historial')
        .bulkWrite(promedios);
    } finally {
      await this.mongo.close();
    }
  }

  async setData() {
    let datos = this.getData();
    const logs = [];
    datos.forEach(async (value) => {
      const medida = value.valueOf() as TemperaturaDto;
      const dep = this.deps[parseInt(medida.departamento) - 1];
      if (dep.TMax < medida.temperatura || dep.TMin > medida.temperatura) {
        logs.push({
          updateOne: {
            filter: { Numero: medida.departamento },
            update: {
              $push: {
                Logs: {
                  Id: new ObjectId(),
                  Log: `Temperatura fuera de rango, temperatura actual: ${medida.temperatura}`,
                  Timestamp: new Date().toLocaleString(),
                  Type: 'warning',
                  Visibility: true,
                },
              },
            },
          },
        });
      }
    });
    if (logs.length > 0) {
      try {
        await this.mongo.connect();
        const db = this.mongo.db('monitoreo');
        await db.collection('Departamento').bulkWrite(logs);
      } catch (error) {
        console.log(error);
      } finally {
        await this.mongo.close();
      }
    }
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
      const TIdeal = getRandomDecimal(15, 20, 1).toFixed(1);
      const TMin = (parseFloat(TIdeal) - getRandomDecimal(0, 2, 1)).toFixed(1);
      const TMax = (parseFloat(TIdeal) + getRandomDecimal(0, 2, 1)).toFixed(1);

      return {
        Numero: String(i + 1),
        TIdeal: TIdeal,
        TMin: TMin,
        TMax: TMax,
      };
    });

    const departaments = [];
    for (const departamento of departamentoData) {
      departaments.push({
        updateOne: {
          filter: { Numero: departamento.Numero },
          update: {
            $setOnInsert: {
              TMin: departamento.TMin,
              TMax: departamento.TMax,
              TIdeal: departamento.TIdeal,
              Logs: [], // Array de logs vacío
            },
          },
          upsert: true,
        },
      });
    }
    try {
      await this.mongo.connect();
      const db = this.mongo.db('monitoreo');
      await db.collection('Departamento').bulkWrite(departaments);
      this.deps = await this.mongo
        .db('monitoreo')
        .collection('Departamento')
        .find()
        .toArray();
    } finally {
      await this.mongo.close();
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

  async readDepartament(departamento: Departamento) {
    const filter = { Numero: departamento.departamento };
    try {
      await this.mongo.connect();
      const db = this.mongo.db('monitoreo');
      const result = await db.collection('Departamento').findOne(filter);
      return JSON.stringify(result);
    } finally {
      await this.mongo.close();
    }
  }

  async getDepartaments() {
    try {
      await this.mongo.connect();
      const db = this.mongo.db('monitoreo');
      const result = await db.collection('Departamento').find().toArray();
      return JSON.stringify(result);
    } finally {
      await this.mongo.close();
    }
  }

  async getHistorial(departamento: Departamento) {
    const filter = { Departamento: departamento.departamento };
    try {
      await this.mongo.connect();
      const db = this.mongo.db('monitoreo');
      const result = await db.collection('Historial').findOne(filter);
      return JSON.stringify(result);
    } finally {
      await this.mongo.close();
    }
  }

  async createLog(create: createLogDto) {
    const filter = { Numero: create.departamento };

    const updateQuery = {
      $push: {
        Logs: {
          Id: new ObjectId(),
          Log: create.Log,
          Type: 'message',
          Timestamp: create.timestamp,
          Visibility: true,
        },
      },
    };
    this.updateDepartamentConnection(filter, updateQuery, {});
  }

  async updateLog(update) {
    const filter = { Numero: update.departamento, 'Logs.Id': update.id };

    const updateQuery = {
      $set: {
        'Logs.$.Log': update.log,
        'Logs.$.Timestamp': update.timestamp,
        'Logs.$.Visibility': update.visibility,
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
    } catch (error) {
      console.log(error);
    } finally {
      await this.mongo.close();
    }
  }

  getData(fdate: Date = new Date(Date.now() - 3 * 3.6e6)): Array<unknown> {
    let cont = 1;
    const datos = [];
    this.deps.forEach((dep) => {
      datos.push({
        departamento: String(cont++),
        temperatura: getRandomDecimal(dep.TMin - 1, dep.TMax + 1, 1),
        fecha: fdate.getTime(), //fdate //new Date().toLocaleString(),
      });
    });
    return datos;
  }
}

/*
let date = 1702600405734; // 2023-12-15T00:33:25.734Z
let datos1 = getData(new Date(date - 1*(3.6e6))); // los datos seran 2023-12-14T23:33:25.734Z

Los datos entregados son con respceto a date - 1 hora zona +3 con respecto a chile


datos2 = getData(); // Sin argumentos, el date sera el del momento en que se inicializa la variable
*/

function getRandomDecimal(min, max, precision): number {
  const factor = Math.pow(10, precision);
  return Math.floor(Math.random() * (max - min + 1) * factor) / factor + min;
}
