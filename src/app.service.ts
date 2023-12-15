import { Inject, Injectable } from '@nestjs/common';
import * as cron from 'node-cron';
import { ClickHouse } from 'clickhouse';
import { TemperaturaDto } from './dto/clickhouseDto';

@Injectable()
export class AppService {

  constructor(
    @Inject('CLICKHOUSE') private readonly clickhouse: ClickHouse,
  ) {
    cron.schedule('0 0 * * *', () => {
      this.average();
    });
  }

  getHello(): string {
    return 'Hello World!';
  }

  async read() {
    const query = `
      SELECT departamento, timestamp AS ultima_medicion, temperatura
      FROM mediciones
      ORDER BY departamento, timestamp DESC
      LIMIT 1 BY departamento
    `;
    const data = await this.clickhouse.query(query).toPromise();
    return JSON.stringify(Array.from(data.entries()));
  }

  async average() {
    const query = `
      SELECT departamento, timestamp, temperatura
      FROM mediciones_temperatura
      WHERE timestamp >= TODAY() AND timestamp < TODAY() + 1;
    `;
    const datosTemperatura = await this.clickhouse.query(query).toPromise();

    const datosPorHora = datosTemperatura.reduce((acumulador, dato: TemperaturaDto) => {
      const hora = dato.timestamp.getHours();
      acumulador[hora] = acumulador[hora] || { total: 0, count: 0 };
      acumulador[hora].total += dato.temperatura;
      acumulador[hora].count += 1;
      return acumulador;
    }, {});

    const promediosPorHora = Object.keys(datosPorHora).map((hora) => {
      const promedio = datosPorHora[hora].total / datosPorHora[hora].count;
      return { hora: parseInt(hora), promedio };
    });
  }

  async setData() {
    /*let cont = 1
    const datos = Array.from({ length: 120 }, () => ({
      departamento: cont++,
      temperatura: parseFloat(getRandomDecimal(15, 20, 2)),
      timestamp: Date.now(), //new Date().toLocaleString(),
    }));*/
    let datos = getData()
    const query = "INSERT INTO mediciones (temperatura, departamento, timestamp) VALUES";
    const values = datos.map(({ temperatura, departamento, timestamp }) => (`(${temperatura}, '${departamento}', '${timestamp}')`)).join(', ');
    await this.clickhouse.query(`${query} ${values}`).toPromise();
  }
}

/*
let date = 1702600405734; // 2023-12-15T00:33:25.734Z
let datos1 = getData(new Date(date - 1*(3.6e6))); // los datos seran 2023-12-14T23:33:25.734Z

Los datos entregados son con respceto a date - 1 hora


datos2 = getData(); // Sin argumentos, el date sera el del momento en que se inicializa la variable
*/

function getData(fdate : Date = new Date()): Array<unknown> { 
  let cont = 1
  const datos = Array.from({ length: 120 }, () => ({
      departamento: String(cont++),
      temperatura: parseFloat(getRandomDecimal(15, 20, 2)),
      date: fdate.getTime(), //fdate //new Date().toLocaleString(),
  }));
  return datos;
}

function getRandomDecimal(min, max, precision) {
  const factor = Math.pow(10, precision);
  return Math.floor(Math.random() * (max - min + 1) * factor) / factor + min;
}

