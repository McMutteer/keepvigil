import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones | Vigil",
  description:
    "Términos y Condiciones de Uso del servicio Vigil, operado por Nqual5 S. de R.L. de C.V.",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-text-primary mt-12 mb-4 pb-2 border-b border-white/[0.06]">
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-text-secondary leading-relaxed mb-4">{children}</p>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="text-text-secondary leading-relaxed">{children}</li>;
}

function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc ml-6 text-text-secondary leading-relaxed mb-4 space-y-1">
      {children}
    </ul>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-16 sm:py-24">
      <h1 className="text-2xl font-semibold text-text-primary mb-2">
        Términos y Condiciones de Uso
      </h1>
      <p className="text-sm text-text-muted mb-4">
        Última actualización: 17 de marzo de 2026
      </p>
      <p className="text-xs text-text-muted mb-12 italic">
        La versión en español es la versión oficial y vinculante. Pronto estará
        disponible una traducción al inglés.
      </p>

      {/* --- Generalidades --- */}
      <SectionTitle>Generalidades</SectionTitle>
      <P>
        Nqual5 S. de R.L. de C.V. (en lo sucesivo &quot;Nqual5&quot;) opera
        Vigil, una GitHub App que analiza pull requests y genera confidence
        scores basados en 8 signals independientes. Vigil automatiza la
        verificación de test plans escritos en PRs, cerrando la brecha entre
        &quot;lo que debería testearse&quot; y &quot;lo que realmente se
        testea&quot;.
      </P>
      <P>
        Vigil es capaz de parsear test plans, ejecutar assertions contra
        archivos del repositorio, verificar contratos entre APIs y consumidores,
        escanear credenciales, analizar diffs, detectar gaps de cobertura y
        generar items de verificación adicionales mediante inteligencia
        artificial.
      </P>
      <P>
        El código fuente de Vigil es open source bajo la licencia MIT. El
        servicio hosted (keepvigil.dev) es operado por Nqual5. Estos Términos
        aplican al uso del servicio hosted. El uso del código fuente se rige
        por la licencia MIT.
      </P>
      <P>
        Contacto legal: Para cualquier consulta relacionada con estos términos y
        condiciones, puede contactarse a través del correo electrónico{" "}
        <a href="mailto:hello@keepvigil.dev" className="text-accent hover:underline">
          hello@keepvigil.dev
        </a>
        . Para asuntos de privacidad:{" "}
        <a href="mailto:privacidad@nqual5.com" className="text-accent hover:underline">
          privacidad@nqual5.com
        </a>
        . Visite{" "}
        <a href="https://keepvigil.dev" className="text-accent hover:underline">
          keepvigil.dev
        </a>{" "}
        para más información.
      </P>
      <P>
        Política de Privacidad: Nuestro{" "}
        <a href="/privacy" className="text-accent hover:underline">
          Aviso de Privacidad
        </a>
        , que explica cómo manejamos la información a través de Vigil, es parte
        integral de estos Términos.
      </P>

      {/* --- S1: Definiciones y Aceptación --- */}
      <SectionTitle>Sección 1: Definiciones y Aceptación de Términos</SectionTitle>
      <P>
        Estos Términos y Condiciones de Uso (&quot;Términos&quot;) regulan el
        acceso y uso de la plataforma Vigil (el &quot;Servicio&quot;),
        proporcionada por Nqual5 S. de R.L. (&quot;nosotros&quot;,
        &quot;nuestro&quot; o &quot;la Empresa&quot;), con domicilio fiscal en
        Jesús María, Aguascalientes, 20908, México.
      </P>
      <P>Definiciones clave:</P>
      <UL>
        <Li>
          <strong className="text-text-primary">Usuario:</strong> toda persona
          física o moral que accede y utiliza el Servicio.
        </Li>
        <Li>
          <strong className="text-text-primary">Repositorio:</strong> el
          repositorio de código en GitHub donde el Usuario ha instalado la
          GitHub App de Vigil.
        </Li>
        <Li>
          <strong className="text-text-primary">Pull Request (PR):</strong> la
          solicitud de cambio de código que Vigil analiza.
        </Li>
        <Li>
          <strong className="text-text-primary">Test Plan:</strong> la lista de
          verificaciones incluida en el cuerpo de un PR, generalmente en formato
          de checkboxes.
        </Li>
        <Li>
          <strong className="text-text-primary">Signal:</strong> cada uno de los
          8 análisis independientes que Vigil ejecuta sobre un PR.
        </Li>
        <Li>
          <strong className="text-text-primary">Confidence Score:</strong> la
          puntuación de 0 a 100 que resulta del promedio ponderado de todos los
          signals.
        </Li>
        <Li>
          <strong className="text-text-primary">Contenido:</strong> todo dato,
          texto, código, archivo o información. Input (contenido proporcionado
          por el Usuario) y Output (contenido generado por el Servicio,
          incluyendo scores y reports).
        </Li>
      </UL>
      <P>
        1.1 Al instalar la GitHub App, crear una cuenta, acceder o usar el
        Servicio, el Usuario reconoce que ha leído, entendido y aceptado estos
        Términos, y se obliga a cumplirlos. En caso de no aceptar estos
        Términos, el Usuario debe desinstalar la GitHub App y abstenerse de usar
        el Servicio.
      </P>
      <P>
        1.2 La Empresa podrá actualizar estos Términos periódicamente para
        reflejar mejoras, cambios legales o de seguridad. Cuando dichos cambios
        afecten materialmente los derechos del Usuario, se notificará con al
        menos 30 días de anticipación mediante correo electrónico registrado o
        aviso dentro de la plataforma. El uso continuo del Servicio después de
        la fecha de entrada en vigor de los cambios constituye aceptación de los
        mismos.
      </P>
      <P>
        1.3 Asimismo, el Usuario acepta que cualquier disputa se resolverá
        individualmente y no como parte de una acción colectiva, salvo que la
        ley aplicable disponga lo contrario.
      </P>

      {/* --- S2: Información de la Empresa --- */}
      <SectionTitle>Sección 2: Información de la Empresa</SectionTitle>
      <P>
        El Servicio es operado por Nqual5 S. de R.L., una sociedad legalmente
        constituida bajo las leyes de los Estados Unidos Mexicanos, con
        domicilio fiscal en Jesús María, Aguascalientes, 20908, México.
      </P>
      <P>Datos de contacto oficial:</P>
      <UL>
        <Li>
          <strong className="text-text-primary">Soporte general:</strong>{" "}
          <a href="mailto:hello@keepvigil.dev" className="text-accent hover:underline">
            hello@keepvigil.dev
          </a>
        </Li>
        <Li>
          <strong className="text-text-primary">Privacidad y protección de datos:</strong>{" "}
          <a href="mailto:privacidad@nqual5.com" className="text-accent hover:underline">
            privacidad@nqual5.com
          </a>
        </Li>
        <Li>
          <strong className="text-text-primary">Responsable de privacidad:</strong>{" "}
          Departamento Legal de Nqual5 S. de R.L., encargado de atender
          solicitudes relacionadas con la protección de datos personales.
        </Li>
      </UL>

      {/* --- S3: Registro y Acceso --- */}
      <SectionTitle>Sección 3: Registro y Acceso</SectionTitle>
      <P>
        3.1 <strong className="text-text-primary">Edad mínima:</strong> Para
        utilizar el Servicio, el Usuario debe tener al menos 13 años de edad o
        la edad mínima legal requerida en su país de residencia para consentir
        el uso de servicios digitales. Los usuarios menores de 18 años deberán
        contar con el consentimiento de sus padres o tutores legales.
      </P>
      <P>
        3.2 <strong className="text-text-primary">Registro de cuenta:</strong>{" "}
        El acceso al Servicio se realiza mediante la instalación de la GitHub
        App en uno o más repositorios. Al instalar la App, el Usuario autoriza a
        Vigil a acceder a los datos del repositorio conforme a los permisos
        solicitados por la App. El Usuario es responsable de gestionar los
        permisos de su instalación de GitHub App.
      </P>
      <P>
        3.3 <strong className="text-text-primary">Uso autorizado:</strong> Si el
        Usuario instala la GitHub App en nombre de una organización o de un
        tercero, declara y garantiza que cuenta con la autoridad suficiente para
        aceptar estos Términos en su nombre.
      </P>
      <P>
        3.4{" "}
        <strong className="text-text-primary">Restricciones de cuenta:</strong>{" "}
        La Empresa se reserva el derecho de suspender o revocar instalaciones
        que presenten actividad abusiva, sospechosa o no autorizada.
      </P>

      {/* --- S4: Alcance del Servicio --- */}
      <SectionTitle>Sección 4: Alcance del Servicio</SectionTitle>
      <P>
        Vigil es una GitHub App que se instala en repositorios de código. Al
        detectar un nuevo pull request o una actualización, Vigil analiza el PR
        y genera un confidence score basado en 8 signals independientes:
      </P>
      <UL>
        <Li>
          <strong className="text-text-primary">CI Bridge:</strong> verifica el
          estado de los checks de CI/CD del PR.
        </Li>
        <Li>
          <strong className="text-text-primary">Credential Scan:</strong>{" "}
          escanea el diff en busca de credenciales expuestas.
        </Li>
        <Li>
          <strong className="text-text-primary">Test Execution:</strong> ejecuta
          los items del test plan (assertions contra archivos, shell commands).
        </Li>
        <Li>
          <strong className="text-text-primary">Plan Augmentor:</strong> genera
          items de verificación adicionales que el test plan no incluyó.
        </Li>
        <Li>
          <strong className="text-text-primary">Contract Checker:</strong>{" "}
          verifica compatibilidad entre APIs y consumidores cuando un PR toca
          ambos.
        </Li>
        <Li>
          <strong className="text-text-primary">Diff Analyzer:</strong> analiza
          el diff para detectar discrepancias con las afirmaciones del test plan.
        </Li>
        <Li>
          <strong className="text-text-primary">Coverage Mapper:</strong> mapea
          la cobertura de archivos modificados contra tests existentes.
        </Li>
        <Li>
          <strong className="text-text-primary">Gap Analyzer:</strong> detecta
          gaps entre lo que el PR cambia y lo que el test plan verifica.
        </Li>
      </UL>
      <P>El Servicio se ofrece en los siguientes niveles:</P>
      <UL>
        <Li>
          <strong className="text-text-primary">Free ($0/mes):</strong> 6
          signals, PRs y repositorios ilimitados. Disponible indefinidamente.
        </Li>
        <Li>
          <strong className="text-text-primary">Pro ($19/mes):</strong> 8
          signals + BYOLLM (Bring Your Own LLM) + webhooks de notificación.
        </Li>
        <Li>
          <strong className="text-text-primary">Team ($49/mes):</strong>{" "}
          dashboard de equipo + SSO + configuración organizacional.
        </Li>
      </UL>
      <P>
        La Empresa podrá ampliar, mejorar o restringir temporalmente
        funcionalidades con el objetivo de mantener la calidad, seguridad o
        cumplimiento legal del Servicio.
      </P>

      {/* --- S5: Uso Permitido y Prohibido --- */}
      <SectionTitle>Sección 5: Uso Permitido y Prohibido</SectionTitle>
      <P>
        El Usuario se compromete a utilizar el Servicio únicamente para fines
        lícitos y autorizados. Queda expresamente prohibido:
      </P>
      <UL>
        <Li>
          Utilizar Vigil para evaluar el desempeño de personas o tomar
          decisiones laborales basándose en los confidence scores.
        </Li>
        <Li>
          Enviar intencionalmente código malicioso diseñado para manipular los
          resultados del análisis.
        </Li>
        <Li>
          Abusar del API de GitHub a través de la integración con Vigil,
          incluyendo generar volúmenes artificiales de PRs para consumir
          recursos del Servicio.
        </Li>
        <Li>
          Intentar eludir medidas de seguridad, realizar ingeniería inversa del
          servicio hosted, o extraer información de forma no autorizada.
        </Li>
        <Li>
          Utilizar los scores como única fuente de información en procesos que
          impliquen riesgos críticos (decisiones financieras, legales o de
          seguridad).
        </Li>
        <Li>
          Difundir contenido ilícito, discriminatorio, de odio o que atente
          contra la dignidad de las personas a través de PRs procesados por el
          Servicio.
        </Li>
      </UL>
      <P>
        La Empresa se reserva el derecho de suspender o revocar inmediatamente
        la instalación del Usuario que incurra en estos usos indebidos, sin que
        exista obligación de reembolso alguno.
      </P>

      {/* --- S6: Contenido y Derechos de Propiedad --- */}
      <SectionTitle>Sección 6: Contenido y Derechos de Propiedad</SectionTitle>
      <P>
        6.1 <strong className="text-text-primary">Propiedad del código:</strong>{" "}
        El código fuente del Usuario sigue siendo 100% propiedad del Usuario.
        Vigil NO almacena código fuente, diffs ni contenido de PRs. Todo el
        procesamiento se realiza en memoria y se descarta tras completar el
        análisis.
      </P>
      <P>
        6.2{" "}
        <strong className="text-text-primary">Propiedad de los resultados:</strong>{" "}
        Los confidence scores, reports y signal results generados por Vigil
        pertenecen al Usuario.
      </P>
      <P>
        6.3 <strong className="text-text-primary">Licencia limitada:</strong>{" "}
        Vigil accede al código del Usuario exclusivamente para análisis
        in-memory a través del GitHub API, conforme a los permisos otorgados
        durante la instalación de la GitHub App. No se almacena, copia ni
        retransmite código fuente más allá del proceso de análisis en tiempo
        real.
      </P>
      <P>
        6.4{" "}
        <strong className="text-text-primary">
          Limitación de uso de los resultados:
        </strong>{" "}
        El Usuario reconoce que los scores y reports son de naturaleza advisory
        y que otros usuarios pueden obtener resultados similares para código
        similar. La decisión de merge es siempre del Usuario.
      </P>
      <P>
        6.5{" "}
        <strong className="text-text-primary">Derechos sobre la plataforma:</strong>{" "}
        Todos los derechos sobre el servicio hosted de Vigil (keepvigil.dev),
        incluyendo su infraestructura, diseño, interfaz y funcionalidades
        propietarias, pertenecen exclusivamente a la Empresa. El código fuente
        de Vigil se distribuye bajo licencia MIT.
      </P>

      {/* --- S7: Datos Personales y Privacidad --- */}
      <SectionTitle>Sección 7: Datos Personales y Privacidad</SectionTitle>
      <P>
        La Empresa recopila, procesa y almacena datos personales de los Usuarios
        únicamente con fines de prestación, mantenimiento y mejora del Servicio,
        cumpliendo con la legislación aplicable, incluyendo la Ley Federal de
        Protección de Datos Personales en Posesión de los Particulares (México),
        el Reglamento General de Protección de Datos (GDPR) y otras regulaciones
        internacionales cuando corresponda.
      </P>
      <P>
        Información detallada sobre el tratamiento de datos se encuentra en
        nuestro{" "}
        <a href="/privacy" className="text-accent hover:underline">
          Aviso de Privacidad
        </a>
        , parte integral de estos Términos.
      </P>

      {/* --- S8: Exactitud y Limitaciones de la IA --- */}
      <SectionTitle>
        Sección 8: Exactitud y Limitaciones de la Inteligencia Artificial
      </SectionTitle>
      <P>
        El Usuario reconoce que Vigil utiliza modelos de lenguaje (LLM) para las
        siguientes funciones:
      </P>
      <UL>
        <Li>Clasificación de items de test plans</Li>
        <Li>Análisis de diffs y detección de discrepancias</Li>
        <Li>Detección de gaps de cobertura</Li>
        <Li>Generación de items de verificación adicionales (Plan Augmentor)</Li>
        <Li>Verificación de contratos entre APIs y consumidores (Contract Checker)</Li>
      </UL>
      <P>Limitaciones conocidas:</P>
      <UL>
        <Li>
          Los confidence scores son advisory — la decisión de merge es siempre
          responsabilidad del Usuario.
        </Li>
        <Li>
          El LLM puede generar false positives (alertar sobre problemas
          inexistentes) o false negatives (no detectar problemas reales).
        </Li>
        <Li>
          Los resultados pueden variar según el contexto del PR, la calidad del
          test plan y la complejidad del código.
        </Li>
        <Li>
          Vigil no garantiza la detección de todos los bugs, vulnerabilidades o
          problemas de calidad en el código.
        </Li>
      </UL>
      <P>
        <strong className="text-text-primary">
          No entrenamiento de modelos:
        </strong>{" "}
        Ni Vigil ni sus proveedores de LLM (Groq, en la configuración por
        defecto) utilizan el código del Usuario para entrenar, refinar o
        influenciar modelos de inteligencia artificial. El código se procesa
        exclusivamente para generar los resultados del análisis y se descarta
        inmediatamente después.
      </P>
      <P>
        <strong className="text-text-primary">BYOLLM:</strong> Cuando el
        Usuario configura su propio LLM mediante{" "}
        <code className="font-mono text-sm text-accent">.vigil.yml</code>,
        fragmentos del código del PR son enviados al proveedor de LLM
        configurado por el Usuario (por ejemplo, OpenAI, Groq, Ollama). Vigil no
        controla el manejo de datos por parte del proveedor del Usuario.
      </P>
      <P>
        La Empresa no será responsable de pérdidas o daños derivados del uso de
        información incorrecta, incompleta o inadecuada generada por los signals
        de Vigil, salvo en los casos expresamente previstos por la ley
        aplicable.
      </P>

      {/* --- S9: Propiedad Intelectual --- */}
      <SectionTitle>Sección 9: Propiedad Intelectual</SectionTitle>
      <P>
        Vigil opera bajo un modelo de licencia dual:
      </P>
      <UL>
        <Li>
          <strong className="text-text-primary">Código fuente (MIT License):</strong>{" "}
          El código fuente de Vigil es open source. El Usuario puede self-host,
          modificar y redistribuir el código conforme a los términos de la
          licencia MIT.
        </Li>
        <Li>
          <strong className="text-text-primary">Servicio hosted (propietario):</strong>{" "}
          El servicio hosted en keepvigil.dev, incluyendo su infraestructura,
          configuración, optimizaciones y funcionalidades exclusivas, es
          propiedad de Nqual5.
        </Li>
      </UL>
      <P>
        Las marcas &quot;Vigil&quot; y &quot;The Sentinel&quot;, así como sus
        logotipos asociados, son propiedad de Nqual5. Su uso no autorizado queda
        prohibido.
      </P>
      <P>
        La licencia MIT del código fuente no implica la transferencia de
        derechos sobre las marcas, el servicio hosted ni las funcionalidades
        propietarias de la plataforma.
      </P>

      {/* --- S10: Pagos y Facturación --- */}
      <SectionTitle>Sección 10: Pagos y Facturación</SectionTitle>
      <P>
        10.1 <strong className="text-text-primary">Modelo de precios:</strong>{" "}
        El tier Free está disponible indefinidamente sin costo. Los tiers Pro y
        Team operan mediante suscripciones mensuales procesadas a través de
        Stripe.
      </P>
      <P>
        10.2 <strong className="text-text-primary">Método de pago:</strong>{" "}
        Los pagos se procesan exclusivamente a través de Stripe. Vigil no
        almacena números de tarjeta ni información financiera directamente.
      </P>
      <P>
        10.3 <strong className="text-text-primary">Reembolsos:</strong> No se
        emiten reembolsos por períodos parciales de facturación. La cancelación
        toma efecto al final del período de facturación vigente.
      </P>
      <P>
        10.4{" "}
        <strong className="text-text-primary">Modificación de precios:</strong>{" "}
        La Empresa podrá actualizar sus tarifas previa notificación con al menos
        30 días de anticipación. El uso continuado del Servicio después de la
        entrada en vigor de las nuevas tarifas constituye aceptación de las
        mismas.
      </P>

      {/* --- S11: Terminación y Suspensión --- */}
      <SectionTitle>Sección 11: Terminación y Suspensión</SectionTitle>
      <P>
        11.1 <strong className="text-text-primary">Terminación voluntaria:</strong>{" "}
        El Usuario puede desinstalar la GitHub App en cualquier momento desde la
        configuración de GitHub. Si tiene una suscripción activa, puede
        cancelarla a través del portal de facturación.
      </P>
      <P>
        11.2{" "}
        <strong className="text-text-primary">
          Suspensión por incumplimiento:
        </strong>{" "}
        La Empresa podrá suspender o revocar la instalación cuando se detecte
        incumplimiento de estos Términos, uso abusivo del Servicio, o actividad
        fraudulenta vinculada a la cuenta.
      </P>
      <P>
        11.3 <strong className="text-text-primary">Notificación:</strong> En la
        medida de lo posible, se notificará previamente al Usuario sobre la
        suspensión, salvo que una acción inmediata sea necesaria.
      </P>
      <P>
        11.4{" "}
        <strong className="text-text-primary">Efectos de la terminación:</strong>{" "}
        Al desinstalar la GitHub App, Vigil deja de tener acceso al repositorio
        inmediatamente. Los datos de metadata almacenados (scores, timestamps)
        serán eliminados conforme a la política de privacidad. No existirá
        obligación de reembolso por períodos no utilizados.
      </P>
      <P>
        11.5{" "}
        <strong className="text-text-primary">Cuentas inactivas:</strong> La
        Empresa podrá eliminar datos asociados a instalaciones inactivas por más
        de 12 meses, previo aviso al Usuario.
      </P>

      {/* --- S12: Garantías y Renuncias --- */}
      <SectionTitle>Sección 12: Garantías y Renuncias</SectionTitle>
      <P>
        12.1{" "}
        <strong className="text-text-primary">Garantía limitada:</strong> La
        Empresa garantiza que el Servicio funcionará de manera sustancialmente
        conforme a su documentación durante los primeros 30 días posteriores a
        la instalación o al inicio de una suscripción de pago. Si el Servicio no
        cumple con esta garantía durante dicho período, la Empresa, a su
        elección, corregirá la no conformidad o reembolsará las tarifas pagadas,
        y cualquiera de las partes podrá dar por terminado el acuerdo.
      </P>
      <P>
        12.2{" "}
        <strong className="text-text-primary">
          Servicio &quot;tal cual&quot; (salvo la garantía del 12.1):
        </strong>{" "}
        El Servicio Vigil se proporciona &quot;tal cual&quot; y &quot;según
        disponibilidad&quot;. La Empresa no ofrece garantías adicionales de
        ningún tipo, expresas o implícitas, incluyendo garantías de
        comerciabilidad, idoneidad para un propósito particular, disponibilidad
        ininterrumpida, ausencia de errores o detección completa de bugs en el
        código del Usuario.
      </P>
      <P>
        12.3{" "}
        <strong className="text-text-primary">
          Exclusión de responsabilidad por terceros:
        </strong>{" "}
        La Empresa no será responsable de servicios proporcionados por terceros
        integrados con el Servicio (GitHub, proveedores de LLM, Stripe), los
        cuales se regirán por sus propios términos y condiciones.
      </P>
      <P>
        12.4{" "}
        <strong className="text-text-primary">Aceptación de riesgos:</strong> Al
        utilizar el Servicio, el Usuario acepta asumir todos los riesgos
        derivados de las decisiones tomadas con base en los confidence scores,
        exime a la Empresa de responsabilidad por bugs que pasen desapercibidos,
        y reconoce que los scores son advisory, no determinísticos.
      </P>

      {/* --- S13: Limitación de Responsabilidad --- */}
      <SectionTitle>Sección 13: Limitación de Responsabilidad</SectionTitle>
      <P>
        En la medida permitida por la legislación aplicable, la responsabilidad
        total de la Empresa frente al Usuario por cualquier reclamación
        derivada del uso del Servicio estará limitada al monto efectivamente
        pagado por el Usuario durante el último mes previo al evento que dio
        lugar a la reclamación.
      </P>
      <P>
        13.1 En ningún caso la Empresa será responsable por daños indirectos,
        incidentales, especiales, consecuenciales o ejemplares, incluidos
        pérdida de beneficios, de datos, de oportunidades de negocio o
        interrupciones del servicio, incluso si la Empresa fue advertida de la
        posibilidad de tales daños.
      </P>
      <P>
        13.2 La Empresa no será responsable por el mal funcionamiento de
        servicios de terceros integrados (GitHub API, proveedores de LLM,
        Stripe).
      </P>
      <P>
        Algunas jurisdicciones no permiten la exclusión de ciertas garantías o
        la limitación de responsabilidad. En esos casos, la responsabilidad de
        la Empresa se limitará al mínimo legalmente permitido.
      </P>

      {/* --- S14: Indemnización --- */}
      <SectionTitle>Sección 14: Indemnización</SectionTitle>
      <P>
        14.1{" "}
        <strong className="text-text-primary">Por parte del Usuario:</strong> El
        Usuario acepta indemnizar, defender y mantener indemne a la Empresa, sus
        afiliados, directores, empleados, representantes y proveedores frente a
        cualquier reclamación, demanda, daño, pérdida, obligación, costo o gasto
        (incluidos honorarios razonables de abogados) que se derive de:
      </P>
      <UL>
        <Li>El uso indebido del Servicio o de sus resultados.</Li>
        <Li>
          La infracción de derechos de terceros, incluidos derechos de propiedad
          intelectual, privacidad o confidencialidad.
        </Li>
        <Li>
          El envío de código malicioso o el abuso deliberado del Servicio.
        </Li>
      </UL>
      <P>
        14.2{" "}
        <strong className="text-text-primary">Por parte de la Empresa:</strong>{" "}
        La Empresa indemnizará al Usuario frente a reclamaciones de terceros que
        aleguen que el Servicio (excluyendo el código open source bajo licencia
        MIT) infringe derechos de propiedad intelectual de dicho tercero. Si se
        determina infracción, la Empresa podrá, a su elección: (a) obtener el
        derecho de uso continuado, (b) modificar el Servicio para eliminar la
        infracción, o (c) dar por terminado el acuerdo y reembolsar las tarifas
        prepagadas no utilizadas. Esta indemnización no aplica cuando la
        infracción resulte del uso del Servicio en combinación con productos no
        proporcionados por la Empresa, del uso indebido del Servicio, o de
        modificaciones realizadas por el Usuario.
      </P>
      <P>
        14.3{" "}
        <strong className="text-text-primary">Procedimiento:</strong> La parte
        indemnizada deberá notificar prontamente a la parte indemnizadora,
        otorgarle control exclusivo de la defensa, y proporcionar la asistencia
        razonable necesaria.
      </P>
      <P>
        Estas obligaciones subsistirán incluso después de la desinstalación de
        la GitHub App o la cancelación de la cuenta.
      </P>

      {/* --- S15: Resolución de Conflictos --- */}
      <SectionTitle>Sección 15: Resolución de Conflictos</SectionTitle>
      <P>
        15.1 <strong className="text-text-primary">Ley aplicable:</strong> Estos
        Términos se regirán por las leyes de los Estados Unidos Mexicanos.
      </P>
      <P>
        15.2 <strong className="text-text-primary">Arbitraje:</strong> Cualquier
        disputa será resuelta mediante arbitraje privado y confidencial en la
        ciudad de Aguascalientes, México. El idioma de las actuaciones será el
        español.
      </P>
      <P>
        15.3{" "}
        <strong className="text-text-primary">Renuncia a acción colectiva:</strong>{" "}
        El Usuario acepta que cualquier reclamación se presentará únicamente de
        forma individual. Queda prohibida la participación en demandas colectivas
        contra la Empresa.
      </P>
      <P>
        15.4 <strong className="text-text-primary">Excepciones:</strong> Esta
        cláusula no impide que el Usuario presente reclamaciones individuales
        ante juzgados de pequeñas causas o solicite medidas cautelares urgentes.
      </P>
      <P>
        15.5{" "}
        <strong className="text-text-primary">Solución informal:</strong> Antes
        de iniciar un arbitraje, el Usuario deberá enviar una notificación por
        escrito a{" "}
        <a href="mailto:hello@keepvigil.dev" className="text-accent hover:underline">
          hello@keepvigil.dev
        </a>{" "}
        describiendo la disputa. Ambas partes se comprometen a intentar resolver
        la disputa de buena fe durante 30 días antes de proceder al arbitraje.
      </P>

      {/* --- S16: Derechos de Autor --- */}
      <SectionTitle>Sección 16: Derechos de Autor y Reportes de Infracción</SectionTitle>
      <P>
        La Empresa respeta los derechos de propiedad intelectual de terceros. Si
        cualquier persona considera que contenido disponible en la plataforma
        infringe derechos de autor, podrá enviar una notificación a{" "}
        <a href="mailto:hello@keepvigil.dev" className="text-accent hover:underline">
          hello@keepvigil.dev
        </a>{" "}
        incluyendo: identificación del material protegido, identificación del
        material infractor, datos de contacto del reclamante, y una declaración
        bajo protesta de decir verdad.
      </P>

      {/* --- S17: Comercio Internacional --- */}
      <SectionTitle>
        Sección 17: Cumplimiento de Leyes de Comercio Internacional
      </SectionTitle>
      <P>
        El Usuario se compromete a utilizar el Servicio en cumplimiento con
        todas las leyes aplicables en materia de control de exportaciones,
        sanciones económicas y comercio internacional. El Servicio no podrá
        utilizarse en países sujetos a sanciones internacionales ni por personas
        o entidades en listas de partes restringidas.
      </P>

      {/* --- S18: Idiomas y Prevalencia --- */}
      <SectionTitle>Sección 18: Idiomas y Prevalencia</SectionTitle>
      <P>
        Estos Términos están redactados originalmente en español, siendo esta la
        versión oficial y vinculante. Podrán ponerse a disposición traducciones
        al inglés con fines de conveniencia. En caso de discrepancia entre la
        versión en español y cualquier traducción, prevalecerá la versión en
        español.
      </P>
      <P>
        El Usuario reconoce que el Servicio puede estar disponible en múltiples
        jurisdicciones. La Empresa no garantiza la disponibilidad del Servicio
        en todos los países.
      </P>

      {/* --- S19: Modificación de los Términos --- */}
      <SectionTitle>Sección 19: Modificación de los Términos</SectionTitle>
      <P>
        La Empresa se reserva el derecho de modificar estos Términos en
        cualquier momento. Cuando las modificaciones afecten de manera
        sustancial los derechos del Usuario, se notificará con al menos 30 días
        de antelación mediante correo electrónico o aviso dentro de la
        plataforma.
      </P>
      <P>
        El uso continuo del Servicio después de la fecha de entrada en vigor
        constituye aceptación plena de los nuevos Términos. Las versiones
        actualizadas estarán disponibles en{" "}
        <a href="/terms" className="text-accent hover:underline">
          keepvigil.dev/terms
        </a>
        .
      </P>

      {/* --- S20: Disposiciones Finales --- */}
      <SectionTitle>Sección 20: Disposiciones Finales</SectionTitle>
      <P>
        Estos Términos constituyen el acuerdo completo entre el Usuario y la
        Empresa en relación con el uso del Servicio, reemplazando cualquier
        acuerdo previo.
      </P>
      <P>
        Si alguna disposición se considera inválida, ilegal o inaplicable, las
        disposiciones restantes continuarán en pleno vigor y efecto.
      </P>
      <P>
        El hecho de que la Empresa no ejerza algún derecho contenido en estos
        Términos no constituirá una renuncia a dicho derecho.
      </P>
      <P>
        Fecha de entrada en vigor: Estos Términos entran en vigor el 17 de marzo
        de 2026.
      </P>
    </div>
  );
}
