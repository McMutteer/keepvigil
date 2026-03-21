import type { Metadata } from "next";
import { SectionTitle, P, Li, UL, Sub } from "@/components/legal-helpers";

export const metadata: Metadata = {
  title: "Aviso de Privacidad | Vigil",
  description:
    "Aviso de Privacidad de Vigil, operado por Nqual5 S. de R.L. de C.V.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-16 sm:py-24">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">
        Aviso de Privacidad
      </h1>
      <p className="text-sm text-text-muted mb-4">
        Última actualización: 21 de marzo de 2026
      </p>
      <p className="text-xs text-text-muted mb-12 italic">
        La versión en español es la versión oficial y vinculante. Pronto estará
        disponible una traducción al inglés.
      </p>

      {/* --- S1: Introducción --- */}
      <SectionTitle>1. Introducción</SectionTitle>
      <P>
        En Nqual5 S. de R.L. de C.V. (en lo sucesivo, &quot;NQUAL5&quot;,
        &quot;nosotros&quot; o &quot;nuestra empresa&quot;), reconocemos la
        importancia de la privacidad y protección de los datos personales.
        Nuestro compromiso es garantizar que la información que nos confían
        nuestros usuarios sea tratada de manera segura, responsable y conforme a
        la legislación mexicana, así como a normas internacionales relevantes,
        incluyendo el Reglamento General de Protección de Datos (GDPR) de la
        Unión Europea y la Ley de Privacidad del Consumidor de California
        (CCPA).
      </P>
      <P>
        Este aviso de privacidad tiene como finalidad explicar de forma clara y
        transparente:
      </P>
      <UL>
        <Li>
          Qué datos personales recopilamos y la base legal que permite su
          tratamiento.
        </Li>
        <Li>Cómo utilizamos y protegemos esa información.</Li>
        <Li>
          Cuáles son sus derechos como titular de los datos y cómo puede
          ejercerlos.
        </Li>
        <Li>
          Bajo qué condiciones se comparte la información con terceros.
        </Li>
      </UL>
      <P>
        Vigil es una GitHub App que analiza pull requests y genera confidence
        scores basados en 8 signals independientes (6 con peso en el score, 2 informativos). Al utilizar Vigil, el
        servicio accede temporalmente a datos del repositorio del Usuario (PR
        body, diff, file tree) para realizar el análisis. La protección de dicha
        información es prioritaria para nosotros.
      </P>
      <P>
        Este documento aplica a todos los usuarios y visitantes de nuestra
        plataforma, independientemente de su ubicación geográfica.
      </P>

      {/* --- S2: Responsable del Tratamiento --- */}
      <SectionTitle>2. Responsable del Tratamiento</SectionTitle>
      <P>
        El responsable del tratamiento de sus datos personales es Nqual5 S. de
        R.L. de C.V., una empresa legalmente constituida conforme a las leyes de
        los Estados Unidos Mexicanos.
      </P>
      <UL>
        <Li>
          <strong className="text-text-primary">Domicilio oficial:</strong>{" "}
          Jesús María, Aguascalientes, C.P. 20908, México.
        </Li>
        <Li>
          <strong className="text-text-primary">
            Área responsable de privacidad:
          </strong>{" "}
          Área Legal de NQUAL5.
        </Li>
        <Li>
          <strong className="text-text-primary">Correo de contacto:</strong>{" "}
          <a
            href="mailto:privacidad@nqual5.com"
            className="text-accent hover:underline"
          >
            privacidad@nqual5.com
          </a>
        </Li>
      </UL>

      {/* --- S3: Datos Personales que Recabamos --- */}
      <SectionTitle>3. Datos Personales que Recabamos</SectionTitle>
      <Sub>3.1 Datos de cuenta y registro</Sub>
      <UL>
        <Li>GitHub user ID y username.</Li>
        <Li>Correo electrónico (obtenido mediante GitHub OAuth).</Li>
        <Li>GitHub App installation ID.</Li>
      </UL>

      <Sub>3.2 Datos de pull requests (procesados in-memory)</Sub>
      <P>
        Vigil accede temporalmente a los siguientes datos a través del GitHub
        API:
      </P>
      <UL>
        <Li>PR title, body (descripción) y test plan (si existe).</Li>
        <Li>PR diff.</Li>
        <Li>File tree del repositorio.</Li>
      </UL>
      <P>
        <strong className="text-text-primary">
          Estos datos son procesados exclusivamente en memoria y NO son
          almacenados.
        </strong>{" "}
        Se descartan tras completar el análisis del PR. Ni Vigil ni su
        proveedor de LLM principal (OpenAI GPT-5.4-mini, con Groq como respaldo automático) utilizan el código del Usuario para
        entrenar, refinar o influenciar modelos de inteligencia artificial.
        
      </P>

      <Sub>3.3 Metadata almacenada</Sub>
      <UL>
        <Li>Confidence scores y resultados de cada signal.</Li>
        <Li>Timestamps de análisis.</Li>
        <Li>
          Identificadores de repositorio y PR (repo name, PR number, installation
          ID).
        </Li>
      </UL>

      <Sub>3.4 Datos técnicos</Sub>
      <UL>
        <Li>Dirección IP (logs de acceso).</Li>
        <Li>Webhook payloads de GitHub (procesados, no almacenados).</Li>
      </UL>

      <Sub>3.5 Datos de pago</Sub>
      <P>
        Los pagos se procesan a través de Stripe. Vigil no almacena números de
        tarjeta ni información financiera directamente. Para más información,
        consulte la{" "}
        <a
          href="https://stripe.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          política de privacidad de Stripe
        </a>
        .
      </P>

      <Sub>3.6 Datos que NO recabamos</Sub>
      <UL>
        <Li>
          <strong className="text-text-primary">Código fuente:</strong>{" "}
          procesado in-memory, nunca almacenado.
        </Li>
        <Li>Datos personales de terceros.</Li>
        <Li>
          Datos sensibles (salud, creencias, afiliación sindical, datos
          biométricos).
        </Li>
        <Li>Cookies de tracking o analytics en el landing page.</Li>
      </UL>

      {/* --- S4: Finalidades del Tratamiento --- */}
      <SectionTitle>4. Finalidades del Tratamiento de Datos</SectionTitle>
      <Sub>4.1 Prestación del servicio</Sub>
      <P>
        Analizar pull requests, generar confidence scores y publicar resultados
        como check runs y comentarios en GitHub.
      </P>
      <Sub>4.2 Mejora del producto</Sub>
      <P>
        Métricas agregadas y anonimizadas sobre el uso del servicio para
        optimizar el rendimiento de los signals y la calidad de los resultados.
      </P>
      <Sub>4.3 Seguridad</Sub>
      <P>
        Detección de abuso, rate limiting, verificación de firmas de webhooks y
        prevención de uso no autorizado.
      </P>
      <Sub>4.4 Comunicación</Sub>
      <P>
        Notificaciones de servicio (cambios de precios, actualizaciones de
        términos, incidentes de seguridad). No enviamos marketing no solicitado.
      </P>

      {/* --- S5: Conservación de los Datos --- */}
      <SectionTitle>5. Conservación de los Datos</SectionTitle>
      <P>
        Los datos personales serán conservados por un período máximo de 24 meses
        contados a partir de la última interacción del usuario con la plataforma,
        salvo que:
      </P>
      <UL>
        <Li>
          Exista una obligación legal que requiera un plazo mayor de
          conservación.
        </Li>
        <Li>
          El usuario solicite la eliminación anticipada conforme a sus derechos
          ARCO.
        </Li>
      </UL>
      <P>
        Transcurrido el plazo de conservación, los datos serán eliminados de
        manera segura. En algunos casos, la información podrá conservarse de
        forma anonimizada con fines exclusivamente estadísticos.
      </P>

      {/* --- S6: Transferencia y Comunicación de Datos --- */}
      <SectionTitle>6. Transferencia y Comunicación de Datos</SectionTitle>
      <Sub>6.1 Sub-procesadores</Sub>
      <P>
        Los datos personales pueden ser compartidos con los siguientes
        proveedores:
      </P>
      <UL>
        <Li>
          <strong className="text-text-primary">GitHub:</strong> plataforma de
          código donde se instala la App y se accede a los datos de PRs.
        </Li>
        <Li>
          <strong className="text-text-primary">OpenAI:</strong> proveedor
          principal de LLM para análisis de PRs (GPT-5.4-mini).
        </Li>
        <Li>
          <strong className="text-text-primary">Groq:</strong> proveedor de LLM de
          respaldo automático cuando OpenAI no está disponible.
        </Li>
        <Li>
          <strong className="text-text-primary">Contabo / Dokploy:</strong>{" "}
          infraestructura de hosting (servidores en la UE).
        </Li>
        <Li>
          <strong className="text-text-primary">Stripe:</strong> procesador de
          pagos.
        </Li>
      </UL>
      
      <Sub>6.2 Transferencias internacionales</Sub>
      <P>
        Algunos datos pueden ser transferidos fuera de México. En estos casos,
        aplicamos Cláusulas Contractuales Tipo y verificamos que el proveedor
        cuente con certificaciones reconocidas (ISO/IEC 27001, SOC 2). El nivel
        de protección será equivalente al exigido por la normativa mexicana y,
        cuando corresponda, el GDPR.
      </P>

      <Sub>6.3 No venta de datos</Sub>
      <P>
        NQUAL5 no vende, alquila ni comercia con los datos personales de sus
        usuarios bajo ninguna circunstancia.
      </P>

      {/* --- S7: Derechos ARCO --- */}
      <SectionTitle>7. Derechos del Titular</SectionTitle>
      <Sub>7.1 Derechos ARCO</Sub>
      <UL>
        <Li>
          <strong className="text-text-primary">Acceso:</strong> conocer qué
          datos personales tratamos.
        </Li>
        <Li>
          <strong className="text-text-primary">Rectificación:</strong> solicitar
          la corrección de información inexacta.
        </Li>
        <Li>
          <strong className="text-text-primary">Cancelación:</strong> pedir la
          eliminación de sus datos.
        </Li>
        <Li>
          <strong className="text-text-primary">Oposición:</strong> negarse al
          tratamiento para fines específicos.
        </Li>
      </UL>

      <Sub>7.2 Derechos adicionales (cuando aplique)</Sub>
      <UL>
        <Li>
          <strong className="text-text-primary">Portabilidad:</strong> recibir
          sus datos en formato estructurado.
        </Li>
        <Li>
          <strong className="text-text-primary">Limitación:</strong> restringir
          el uso de sus datos en ciertas circunstancias.
        </Li>
        <Li>
          <strong className="text-text-primary">Revocación:</strong> retirar el
          consentimiento previamente otorgado, sin efectos retroactivos.
        </Li>
      </UL>

      <Sub>Procedimiento</Sub>
      <P>
        Los titulares pueden ejercer sus derechos enviando una solicitud a{" "}
        <a
          href="mailto:privacidad@nqual5.com"
          className="text-accent hover:underline"
        >
          privacidad@nqual5.com
        </a>{" "}
        incluyendo: nombre completo, medio de contacto, descripción del derecho
        a ejercer, y documentación de identidad. Plazo máximo de respuesta: 20
        días hábiles.
      </P>

      {/* --- S8: Cookies --- */}
      <SectionTitle>8. Cookies y Tecnologías de Rastreo</SectionTitle>
      <P>
        Vigil no utiliza cookies, analytics ni tracking en el landing page ni en
        la GitHub App. No hay scripts de terceros, pixel trackers ni grabaciones
        de sesión.
      </P>

      {/* --- S9: Propiedad de la Información --- */}
      <SectionTitle>9. Propiedad de la Información</SectionTitle>
      <P>
        El código fuente del Usuario es y sigue siendo propiedad exclusiva del
        Usuario. Vigil accede temporalmente al código a través del GitHub API
        para realizar el análisis in-memory. No se almacena, copia ni
        retransmite código fuente.
      </P>
      <P>
        Los confidence scores y reports generados por Vigil pertenecen al
        Usuario. NQUAL5 conserva derechos limitados para reutilizar resultados
        de forma anonimizada y agregada con fines de mejora del servicio.
      </P>

      {/* --- S10: Seguridad --- */}
      <SectionTitle>10. Seguridad</SectionTitle>
      <Sub>10.1 Medidas técnicas</Sub>
      <UL>
        <Li>Cifrado en tránsito (TLS) para todas las comunicaciones.</Li>
        <Li>
          Almacenamiento seguro en servidores protegidos mediante firewalls y
          controles de acceso.
        </Li>
        <Li>
          Procesamiento in-memory del código (nunca toca disco ni base de
          datos).
        </Li>
        <Li>
          Verificación de firmas de webhooks de GitHub para prevenir spoofing.
        </Li>
      </UL>

      <Sub>10.2 Medidas administrativas</Sub>
      <UL>
        <Li>Control de acceso basado en roles.</Li>
        <Li>
          Secrets gestionados mediante Infisical (nunca en código fuente).
        </Li>
      </UL>

      <Sub>10.3 Gestión de incidentes</Sub>
      <P>
        En caso de vulneración de seguridad, NQUAL5 se compromete a evaluar el
        alcance de manera inmediata, implementar medidas correctivas, y
        notificar a los titulares afectados y a la autoridad competente dentro
        de un plazo máximo de 72 horas desde su detección.
      </P>

      {/* --- S11: Uso Permitido --- */}
      <SectionTitle>11. Uso Permitido y Responsabilidad</SectionTitle>
      <P>
        Los usuarios deben utilizar Vigil exclusivamente con fines legítimos
        relacionados con el análisis de pull requests y la verificación de código.
        Está prohibido utilizar el servicio para evaluar personas, enviar código
        malicioso, o abusar del GitHub API. Para detalle completo, consulte la
        Sección 5 de los{" "}
        <a href="/terms" className="text-accent hover:underline">
          Términos y Condiciones
        </a>
        .
      </P>
      <P>
        La responsabilidad económica máxima de NQUAL5 se limitará al monto
        pagado por el usuario durante el mes inmediatamente anterior al
        incidente.
      </P>

      {/* --- S12: Alcance Internacional --- */}
      <SectionTitle>12. Alcance Internacional y Legislación Aplicable</SectionTitle>
      <P>
        Los servicios de NQUAL5 están disponibles globalmente. NQUAL5 se
        compromete a cumplir con la legislación mexicana y con las principales
        normativas internacionales:
      </P>
      <UL>
        <Li>Reglamento General de Protección de Datos (GDPR) de la UE.</Li>
        <Li>Ley de Privacidad del Consumidor de California (CCPA).</Li>
        <Li>
          Ley Federal de Protección de Datos Personales en Posesión de los
          Particulares (LFPDPPP) de México.
        </Li>
      </UL>
      <P>
        Este Aviso se rige por las leyes de los Estados Unidos Mexicanos.
        Cualquier controversia relacionada con el tratamiento de datos
        personales se resolverá conforme al mecanismo de arbitraje establecido
        en la Sección 15 de los{" "}
        <a href="/terms" className="text-accent hover:underline">
          Términos y Condiciones
        </a>
        .
      </P>
      <P>
        El Aviso de Privacidad está disponible en español (versión vinculante).
        En caso de discrepancia con traducciones, prevalecerá la versión en
        español.
      </P>

      {/* --- S13: Cambios al Aviso --- */}
      <SectionTitle>13. Cambios al Aviso de Privacidad</SectionTitle>
      <P>
        NQUAL5 podrá modificar este Aviso en cualquier momento. En caso de
        cambios significativos, notificaremos a los usuarios mediante correo
        electrónico o avisos en la plataforma. El uso continuado del servicio
        constituye aceptación de los cambios.
      </P>

      {/* --- S14: Contacto --- */}
      <SectionTitle>14. Contacto</SectionTitle>
      <P>
        Para dudas, comentarios o solicitudes relacionadas con este Aviso de
        Privacidad:
      </P>
      <UL>
        <Li>
          <strong className="text-text-primary">Privacidad:</strong>{" "}
          <a
            href="mailto:privacidad@nqual5.com"
            className="text-accent hover:underline"
          >
            privacidad@nqual5.com
          </a>
        </Li>
        <Li>
          <strong className="text-text-primary">Soporte general:</strong>{" "}
          <a
            href="mailto:hello@keepvigil.dev"
            className="text-accent hover:underline"
          >
            hello@keepvigil.dev
          </a>
        </Li>
        <Li>
          <strong className="text-text-primary">Domicilio:</strong> Jesús María,
          Aguascalientes, C.P. 20908, México.
        </Li>
      </UL>
      <P>
        Plazo de respuesta para solicitudes de derechos: máximo 20 días hábiles
        desde la recepción de la solicitud completa.
      </P>

      {/* --- S15: Menores de Edad --- */}
      <SectionTitle>15. Tratamiento de Datos de Menores de Edad</SectionTitle>
      <P>
        El uso de Vigil requiere una cuenta de GitHub y tener al menos 13 años
        de edad. No recopilamos intencionalmente datos de menores de 13 años sin
        consentimiento verificable de sus padres o tutores legales.
      </P>
      <P>
        Si tenemos conocimiento de que hemos recopilado datos de un menor sin
        consentimiento, eliminaremos dicha información de manera inmediata y
        notificaremos a los responsables legales cuando sea posible. Contacto
        para estos casos:{" "}
        <a
          href="mailto:privacidad@nqual5.com"
          className="text-accent hover:underline"
        >
          privacidad@nqual5.com
        </a>
        .
      </P>

      {/* --- S16: Vigencia --- */}
      <SectionTitle>16. Vigencia y Última Actualización</SectionTitle>
      <P>
        Este Aviso de Privacidad entra en vigor el 21 de marzo de 2026 y
        permanecerá vigente mientras se mantengan las finalidades del
        tratamiento de datos aquí descritas.
      </P>
      <Sub>Historial de cambios</Sub>
      <UL>
        <Li>
          <strong className="text-text-primary">17 de marzo de 2026:</strong>{" "}
          Publicación de la versión inicial del Aviso de Privacidad de Vigil,
          adaptado del marco legal de NQUAL5.
        </Li>
        <Li>
          <strong className="text-text-primary">21 de marzo de 2026:</strong>{" "}
          Actualización: señales v2, proveedor LLM principal (OpenAI), eliminación
          de referencias a BYOLLM (funcionalidad deprecada).
        </Li>
      </UL>
      <P>
        NQUAL5 mantendrá un registro histórico de las versiones anteriores,
        disponibles previa solicitud del titular de los datos personales.
      </P>
    </div>
  );
}
