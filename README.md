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
Se utilizo clickhouse en un servidor de aws en la nube como base de datos columnar algunas de las funciones que se utilizaron en clickhouse fueron:

CREATE TABLE mediciones
(
    `temperatura` Float32,
    `departamento` String,
    `timestamp` DateTime
)
ENGINE = MergeTree
ORDER BY (timestamp);

INSERT INTO mediciones (temperatura, departamento, timestamp)
VALUES
    (25.5, 'Departamento1', '2023-12-10 12:00:00'),
    (26.0, 'Departamento1', '2023-12-10 12:30:00'),
    (24.8, 'Departamento2', '2023-12-10 12:00:00'),
    (25.2, 'Departamento2', '2023-12-10 12:30:00'),
    (26.5, 'Departamento3', '2023-12-10 12:00:00'),
    (27.0, 'Departamento3', '2023-12-10 12:30:00'),
    (23.5, 'Departamento4', '2023-12-10 12:00:00'),
    (24.0, 'Departamento4', '2023-12-10 12:30:00'),
    (28.0, 'Departamento5', '2023-12-10 12:00:00'),
    (29.0, 'Departamento5', '2023-12-10 12:30:00');

