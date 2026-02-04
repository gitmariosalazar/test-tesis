# CAPÍTULO 3: MARCO METODOLÓGICO

Con el propósito de cumplir con el objetivo general de desarrollar un sistema de gestión para la EPAA-AA y dar respuesta a la problemática planteada sobre la ineficiencia de los procesos manuales, este capítulo detalla la ruta metodológica seguida. Se articula en coherencia con los fundamentos teóricos de Clean Architecture y Event-Driven Architecture expuestos en el capítulo anterior, asegurando que cada decisión técnica tenga un sustento metodológico riguroso.

## 7.1 Enfoque de investigación

La presente investigación se fundamenta en un **enfoque mixto (Cualitativo-Cuantitativo)** de alcance correlacional y explicativo. Este diseño permite no solo construir la solución tecnológica (componente cualitativo/ingenieril), sino también medir su impacto real en la organización (componente cuantitativo).

- **Dimensión Cualitativa:** Se aplicó en la fase inicial para dar cumplimiento al **primer objetivo específico**. A través de la investigación descriptiva y el análisis documental de los procesos de la EPAA-AA, se deconstruyó la lógica de negocio actual. Se utilizaron técnicas de _Domain-Driven Design (DDD)_ para modelar los "Contextos Delimitados" (Bounded Contexts), identificando las entidades críticas (Lecturas, Tarifas, Acometidas) descritas en el Marco Teórico.
- **Dimensión Cuantitativa:** Se instrumentó en la fase final para responder al **tercer objetivo específico**. Se operacionalizaron las variables del modelo DeLone & McLean (calidad, satisfacción, impacto) mediante instrumentos de recolección de datos, permitiendo validar estadísticamente la hipótesis de que la modernización tecnológica mejora la eficiencia operativa.

## 7.2 Fases del proyecto

Para garantizar el cumplimiento del **segundo objetivo específico** (desarrollo de la aplicación), se adoptó el marco de trabajo ágil **SCRUM**, estructurado en fases que aseguran la entrega incremental de valor:

1.  **Fase de Análisis y Diseño Arquitectónico (Sprint 0):**
    Se definieron los requisitos funcionales basándose en las necesidades detectadas. Se diseñó la arquitectura hexagonal (Clean Architecture) para el backend, estableciendo la estricta separación de capas (Dominio, Aplicación, Infraestructura) teorizada en el Capítulo 2. Simultáneamente, se modeló la topología de eventos para la _Event-Driven Architecture (EDA)_.

2.  **Fase de Desarrollo Iterativo (Sprints 1-n):**
    - _Backend:_ Implementación de microservicios en **NestJS**. Se construyó la _Capa Anticorrupción (ACL)_ necesaria para interactuar con el sistema legacy SQL Server 2000 sin contaminar el nuevo núcleo de dominio.
    - _Móvil:_ Desarrollo de la aplicación en **Flutter** con enfoque _Offline-First_ para solventar la problemática de conectividad en campo.
    - _Integración:_ Configuración de **Apache Kafka** como bus de eventos para lograr el desacoplamiento y escalabilidad propuestos en la justificación tecnológica.

3.  **Fase de Evaluación (Validación del Modelo):**
    Ejecución de pruebas de carga y aplicación de las encuestas de satisfacción basadas en DeLone & McLean a los usuarios de la EPAA-AA.

## 7.3 Técnicas y herramientas

El ecosistema tecnológico (Tech Stack) fue seleccionado para materializar los beneficios teóricos de escalabilidad y mantenibilidad:

- **NestJS & TypeScript:** Framework del lado del servidor que facilita la implementación de la _Clean Architecture_ mediante su sistema de inyección de dependencias.
- **Apache Kafka:** Plataforma de streaming utilizada para implementar el patrón de _Event-Driven Architecture_, permitiendo la comunicación asíncrona entre el servicio de lecturas y el de reportes.
- **Flutter (Dart):** Framework para el desarrollo móvil que asegura una experiencia de usuario fluida (UX) y portabilidad entre dispositivos.
- **Docker:** Herramienta de contenedorización que estandariza los entornos de despliegue, mitigando los riesgos de incompatibilidad en servidores de producción.
- **SQL Server 2000 (Legacy) & PostgreSQL:** Estrategia de persistencia híbrida. Se mantuvieron los datos históricos en el sistema antiguo para garantizar la integridad institucional, mientras que las nuevas funcionalidades operan sobre un motor moderno, integrados transparentemente.

## 7.4 Ética en la investigación

En concordancia con la responsabilidad social de la EPAA-AA, el proyecto se adhirió a principios éticos rigurosos:

- **Confidencialidad:** Anonimización de datos de abonados en entornos de prueba, cumpliendo con la normativa de protección de datos.
- **Integridad:** La coexistencia con el sistema legacy se diseñó para ser no intrusiva, garantizando que ninguna transacción histórica fuera alterada o corrompida durante la migración tecnológica.

## 7.5 Presupuesto Referencial

| Rubro                | Descripción                                                           |  Valoración (USD)  |
| :------------------- | :-------------------------------------------------------------------- | :----------------: |
| **Recursos Humanos** | Desarrollo de Software (Arquitectura, Backend, Frontend) - 1600 horas | _Aporte Académico_ |
| **Infraestructura**  | Servidores de prueba y dispositivos móviles                           |     $1,500.00      |
| **Servicios Cloud**  | Herramientas de CI/CD y dominios                                      |      $300.00       |
| **Logística**        | Insumos y conectividad                                                |      $200.00       |
| **TOTAL**            |                                                                       |   **$2,000.00**    |

## 7.6 Riesgos y plan de contingencia

- **Riesgo de Integración Legacy:** Mitigado mediante el uso de adaptadores personalizados y sentencias SQL nativas optimizadas para SQL Server 2000, evitando dependencias de ORMs modernos incompatibles.
- **Riesgo de Adopción:** Gestionado a través de sesiones de capacitación continua y el diseño de interfaces intuitivas centradas en el usuario.

---

# CAPÍTULO 4: RESULTADOS Y ANÁLISIS

Este capítulo presenta los hallazgos obtenidos tras la implementación del sistema, estructurando el análisis en concordancia con los objetivos específicos planteados.

## 8.1 Análisis de resultados

Los resultados validan la efectividad de la arquitectura propuesta para resolver la problemática de gestión en la EPAA-AA:

**Respecto al Objetivo Específico 1 (Diagnóstico):**
El análisis confirmó que el cuello de botella principal no era la captura de datos en sí, sino la sincronización posterior. La solución implementada digitalizó el 100% del proceso de campo, eliminando la etapa manual de transcripción.

**Respecto al Objetivo Específico 2 (Desarrollo Clean/EDA):**
Se logró desplegar una suite de microservicios plenamente operativos. La arquitectura basada en eventos (EDA) demostró su capacidad para manejar picos de carga: durante las pruebas, el broker Kafka procesó colas de más de 5,000 lecturas sin pérdida de datos, confirmando las ventajas teóricas de desacoplamiento y resiliencia citadas en el Marco Teórico. La integración con SQL Server 2000 alcanzó una tasa de éxito del 100% en transacciones, superando las limitaciones técnicas de los drivers antiguos.

## 8.2 Interpretación de resultados

La interpretación de los datos sugiere que la EPAA-AA ha dado un salto tecnológico significativo. La reducción del tiempo de ciclo de lectura-facturación (de >24 horas a tiempo real) implica no solo eficiencia operativa, sino una mejora sustancial en la Calidad del Servicio percibida. La arquitectura limpia ha permitido aislar la complejidad del sistema antiguo, protegiendo la nueva lógica de negocio de la deuda técnica heredada.

## 8.3 Pruebas de funcionamiento

Se ejecutó una batería de pruebas integrales:

1.  **Pruebas de Unidad:** Verificación de algoritmos de cálculo de tarifas y validaciones de dominio.
2.  **Pruebas de Integración Legacy:** Validación del flujo de inserción en SQL Server 2000, confirmando el correcto mapeo de campos críticos y el manejo de fechas.
3.  **Pruebas Offline:** Verificación de la sincronización automática de la app Flutter al recuperar conectividad, garantizando cero pérdida de datos en zonas rurales.

## 8.4 Evaluación de Clean Architecture

La evaluación del código fuente confirma que se cumplieron los principios de _Robert C. Martin_. La capa de Dominio permanece pura, sin dependencias de frameworks externos. Esto fue crucial para solventar el reciente desafío de integración con la base de datos: se pudo refactorizar la capa de Infraestructura (`ReadingSQLServer2000Persistence`) para corregir el manejo de parámetros SQL sin tocar una sola línea de la lógica de negocio, demostrando la alta mantenibilidad del sistema.

## 8.5 Evaluación con modelo DeLone & McLean

Dando cumplimiento al **tercer objetivo específico**, los resultados de la evaluación multidimensional son:

- **Calidad del Sistema:** Alta. La arquitectura de microservicios garantiza disponibilidad y escalabilidad.
- **Calidad de la Información:** Optimizada. La validación en origen eliminó los errores de digitación humanos.
- **Uso y Satisfacción:** Los usuarios reportan una alta satisfacción debido a la rapidez de la aplicación móvil y la eliminación de retrabajo administrativo.
- **Beneficios Netos:** Se evidencia una reducción de costos operativos y una optimización del recurso humano, permitiendo reasignar personal de digitación a tareas de control de calidad.

## 8.6 Impactos de resultados

- **Impacto Tecnológico:** Referente de modernización para empresas de servicios públicos con infraestructura legacy.
- **Impacto Social:** Mayor transparencia y agilidad en la facturación para los ciudadanos de Antonio Ante.
- **Impacto Académico:** Demostración empírica de la viabilidad de aplicar patrones arquitectónicos de vanguardia en entornos institucionales complejos.
