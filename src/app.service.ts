import { Inject, Injectable } from '@nestjs/common';
import * as cron from 'node-cron';
import { ClickHouse } from 'clickhouse';
import { TemperaturaDto } from './dto/clickhouseDto';

@Injectable()
export class AppService {

  constructor(
    @Inject('CLICKHOUSE') private readonly clickhouse: ClickHouse,
  ) {
    cron.schedule('55 02 00 * * *', () => {
      this.average();
    });
    setInterval(()=>{this.setData()}, 30000)
  }

  getHello(): string {
    return 'Hello World!';
  }

  async read() {
    const query = `
      SELECT departamento, fecha AS ultima_medicion, temperatura
      FROM mediciones
      ORDER BY departamento, timestamp DESC
      LIMIT 1 BY departamento
    `;
    const data = await this.clickhouse.query(query).toPromise();
    return JSON.stringify(Array.from(data.entries()));
  }

  async average() {
    const today = new Date();
    const init = (new Date(today.setHours(0,0,0,0))).toLocaleString('en-CA',{hour12:false}).split(',');
    const fin = new Date(today.setHours(23,59,59,999)).toLocaleString('en-CA',{hour12:false}).split(',');
    const query = `
      SELECT departamento, fecha, temperatura
      FROM mediciones
      WHERE fecha >= '${String(init[0]+' '+(init[1].split(' ')[1].replace('24:','00:')))}' AND fecha <  '${String(fin[0]+' '+fin[1].split(' ')[1])}';
    `;
    const datosTemperatura = await this.clickhouse.query(query).toPromise();

    console.log(datosTemperatura)

    const datosPorHora = datosTemperatura.reduce((acumulador, dato: TemperaturaDto) => {
      const hora = (new Date(dato.fecha)).getHours();
      const departamento = dato.departamento;
      if (!acumulador[hora]) acumulador[hora] = {};
      if (!acumulador[hora][departamento]) acumulador[hora][departamento] = { total: 0, count: 0 };
      acumulador[hora][departamento].total += dato.temperatura;
      acumulador[hora][departamento].count += 1;
      return acumulador;
    }, {});

    console.log(datosPorHora)

    const promediosPorHora = Object.keys(datosPorHora).map((hora) => {
      const departamento = Object.keys(datosPorHora[hora]);
      const promediosPorDepartamento = departamento.map((departamento) => {
        const promedio = datosPorHora[hora][departamento].total / datosPorHora[hora][departamento].count;
        return { hora, departamento, promedio };
      });
      return promediosPorDepartamento;
    });
    console.log(promediosPorHora)
  }

  async setData() {
    let datos = getData()
    const query = "INSERT INTO mediciones (temperatura, departamento, fecha) VALUES";
    const values = datos.map(({ temperatura, departamento, fecha }) => (`(${temperatura}, '${departamento}', '${fecha}')`)).join(', ');
    await this.clickhouse.query(`${query} ${values}`).toPromise();
  }
}

/*
let date = 1702600405734; // 2023-12-15T00:33:25.734Z
let datos1 = getData(new Date(date - 1*(3.6e6))); // los datos seran 2023-12-14T23:33:25.734Z

Los datos entregados son con respceto a date - 1 hora zona +3 con respecto a chile


datos2 = getData(); // Sin argumentos, el date sera el del momento en que se inicializa la variable
*/

function getData(fdate: Date = new Date(Date.now() - 3 * (3.6e6))): Array<unknown> {
  let cont = 1
  const datos = Array.from({ length: 120 }, () => ({
    departamento: String(cont++),
    temperatura: parseFloat(getRandomDecimal(15, 20, 2)),
    fecha: fdate.getTime(), //fdate //new Date().toLocaleString(),
  }));
  return datos;
}

function getRandomDecimal(min, max, precision) {
  const factor = Math.pow(10, precision);
  return Math.floor(Math.random() * (max - min + 1) * factor) / factor + min;
}

