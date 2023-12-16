# Servidor de Monitoreo de temperatura

## MongoDB
La estructura de los datos en mongoDB es:

Departamento{
    Numero: 
    TMin:
    TMax:
    TIdeal:
    Logs:[
        {
            Log:
            TimeStamp:
            Visibilidad:
        }
    ]
}

Historial{
    Departamento:
    Medición:[
        {
            TimeStamp:
            Temperatura:
        }
    ]
}


## ClickHouse
Se utilizo clickhouse en un servidor de aws en la nube como base de datos columnar utilizando el siguiente formato:
Tabla: mediciones
col1: temperatura | col2: Departamento | col3: fecha

## Funcionalidades pendientes
[*] get Departamento MongoDB
[] ocultar Log
[] Historial de 2 años
[] BD usuarios en amazon RDS


## Postgres
Se utilizo postgres para crear una base de datos SQL que almacene a los usuarios del sistema, se alojo en elephantSQL con un plan gratuito