import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, Lock, ExternalLink, ScrollText } from 'lucide-react';

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onAccept: () => void;
  isReadOnlyMode?: boolean; // For viewing terms anytime from footer
  onCloseReadOnly?: () => void;
}

export const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({
  isOpen,
  onAccept,
  isReadOnlyMode = false,
  onCloseReadOnly
}) => {
  const [hasAgreed, setHasAgreed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHasAgreed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isReadOnlyMode) {
      if (onCloseReadOnly) onCloseReadOnly();
      return;
    }
    if (!hasAgreed) return;
    onAccept();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#2D2926]/85 backdrop-blur-md animate-fade-in font-sans selection:bg-[#2D2926] selection:text-white">
      <div className="relative w-full max-w-2xl bg-[#F7F3EF] border-2 border-[#2D2926] rounded-sm shadow-2xl text-[#2D2926] flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#EFE9E2] border-b-2 border-[#2D2926] rounded-t-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm border border-amber-500/40 bg-[#2D2926] text-white flex items-center justify-center shrink-0 overflow-hidden p-0.5 shadow-sm">
              <img src="/proyect-company-logo.jpg" alt="PROYECT COMPANY" className="w-full h-full object-cover rounded-2xs" />
            </div>
            <div>
              <h3 className="font-serif font-extrabold text-[#2D2926] text-lg sm:text-xl leading-tight uppercase tracking-tight">
                Términos y Condiciones de Uso
              </h3>
              <p className="text-xs text-amber-800 font-bold uppercase tracking-wider">
                PROYECT COMPANY • Última actualización: 31 de julio de 2026
              </p>
            </div>
          </div>

          {isReadOnlyMode && onCloseReadOnly && (
            <button
              onClick={onCloseReadOnly}
              className="px-3 py-1 bg-[#2D2926] text-white font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-[#403C39]"
            >
              Cerrar
            </button>
          )}
        </div>

        {/* Scrollable Terms Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm bg-[#F7F3EF] leading-relaxed select-text border-b border-[#2D2926]/15">
          
          <div className="p-3.5 bg-amber-500/10 border border-amber-600/30 rounded-sm text-xs font-medium text-[#2D2926] flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-amber-800 shrink-0" />
            <span>
              <strong>Aviso Importante:</strong> Para utilizar el sistema de gestión y control de stock de PROYECT COMPANY, debes leer y aceptar los términos y condiciones.
            </span>
          </div>

          <article className="prose prose-sm max-w-none text-[#2D2926] space-y-3 font-sans">
            <h1 className="text-base font-serif font-bold uppercase tracking-wider text-[#2D2926] border-b border-[#2D2926]/20 pb-1">
              # TÉRMINOS Y CONDICIONES DE USO
            </h1>
            <p className="text-xs font-mono text-[#2D2926]/70 font-bold">
              <strong>Última actualización:</strong> 31 de julio de 2026
            </p>

            <h2 className="text-sm font-bold text-[#2D2926] pt-1">1. Aceptación de los Términos</h2>
            <p className="text-xs text-[#2D2926]/90">
              Al registrarse, acceder o utilizar esta aplicación web, el Usuario declara haber leído, comprendido y aceptado íntegramente los presentes Términos y Condiciones. Si el Usuario no está de acuerdo con cualquiera de estas disposiciones, deberá abstenerse de utilizar la aplicación.
            </p>

            <h2 className="text-sm font-bold text-[#2D2926] pt-1">2. Uso Permitido</h2>
            <p className="text-xs text-[#2D2926]/90">
              La aplicación ha sido desarrollada como una herramienta de gestión y control de stock para fines exclusivamente laborales, comerciales o administrativos.
            </p>
            <p className="text-xs text-[#2D2926]/90">
              El Usuario se compromete a utilizar la plataforma únicamente para fines lícitos y conforme a la legislación vigente. Queda expresamente prohibido utilizar la aplicación para actividades ilegales, fraudulentas, maliciosas o que puedan perjudicar a terceros o al funcionamiento del servicio.
            </p>

            <h2 className="text-sm font-bold text-[#2D2926] pt-1">3. Responsabilidad sobre la Información Cargada</h2>
            <p className="text-xs text-[#2D2926]/90">
              El Usuario es el único responsable por toda la información que ingrese, almacene, modifique o elimine dentro de la aplicación. Esto incluye, entre otros: Nombre de productos, Códigos de barras, Categorías, Marcas, Descripciones, Fotografías, Precios, Cantidades, Fechas de vencimiento, Ubicaciones, Datos de inventario y cualquier otro dato incorporado manual o automáticamente.
            </p>
            <p className="text-xs text-[#2D2926]/90">
              El Usuario declara que posee los derechos necesarios para cargar dicha información y asume toda responsabilidad por su contenido, exactitud y legalidad.
            </p>

            <h2 className="text-sm font-bold text-[#2D2926] pt-1">4. Recopilación de Información</h2>
            <p className="text-xs text-[#2D2926]/90">
              Al utilizar la aplicación, el Usuario autoriza el almacenamiento y procesamiento de la información necesaria para el correcto funcionamiento del servicio: Productos registrados, Fotografías, Códigos de barras, Precios, Fechas de vencimiento, Stock disponible, Historial de movimientos, Información de la cuenta, Configuraciones personalizadas, Registros de actividad del sistema y datos técnicos indispensables para el funcionamiento.
            </p>
            <p className="text-xs text-[#2D2926]/90">
              La recopilación de esta información tiene como única finalidad brindar el servicio solicitado y mejorar la experiencia de uso.
            </p>

            <h2 className="text-sm font-bold text-[#2D2926] pt-1">5. Dispositivo del Usuario</h2>
            <p className="text-xs text-[#2D2926]/90">
              El Usuario acepta utilizar la aplicación desde dispositivos de su propiedad o respecto de los cuales posea autorización suficiente. Es responsabilidad exclusiva del Usuario mantener la seguridad de su dispositivo, credenciales de acceso y conexión a Internet.
            </p>

            <h2 className="text-sm font-bold text-[#2D2926] pt-1">6. Uso Indebido</h2>
            <p className="text-xs text-[#2D2926]/90">
              Se encuentra estrictamente prohibido: Intentar acceder sin autorización a servidores o bases de datos, manipular el funcionamiento de la aplicación, obtener información de otros usuarios, interferir con la seguridad del sistema, ejecutar ataques informáticos, utilizar robots, scripts o software automatizado para vulnerar la plataforma, realizar ingeniería inversa del sistema, intentar copiar funcionalidades protegidas o distribuir malware o software malicioso.
            </p>
            <p className="text-xs text-[#2D2926]/90 font-medium">
              Cualquier actividad sospechosa podrá ocasionar la suspensión inmediata de la cuenta.
            </p>

            <h2 className="text-sm font-bold text-[#2D2926] pt-1">7. Propiedad Intelectual</h2>
            <p className="text-xs text-[#2D2926]/90">
              Todo el software, código fuente, diseño, interfaz, logotipos, funcionalidades, estructura de la base de datos, documentación y demás elementos que integran la aplicación constituyen propiedad intelectual exclusiva de sus titulares y se encuentran protegidos por las leyes aplicables.
            </p>
            <p className="text-xs text-[#2D2926]/90">
              Queda estrictamente prohibido copiar total o parcialmente el código fuente, clonar la aplicación, revender la aplicación sin autorización expresa y por escrito, comercializar versiones modificadas, extraer la base de datos, copiar la estructura del sistema, reutilizar recursos gráficos o técnicos o descompilar el software.
            </p>

            <h2 className="text-sm font-bold text-[#2D2926] pt-1">8. Accesos No Autorizados</h2>
            <p className="text-xs text-[#2D2926]/90">
              Cualquier intento de robo de información, base de datos, código fuente, acceso indebido a servidores, alteración del sistema o ataques informáticos será considerado una violación grave de estos Términos y Condiciones.
            </p>
            <p className="text-xs text-[#2D2926]/90">
              Los registros del sistema, direcciones IP, logs de acceso, evidencias digitales y demás elementos técnicos podrán conservarse y utilizarse como prueba para efectuar las denuncias civiles o penales que correspondan ante las autoridades competentes.
            </p>

            <h2 className="text-sm font-bold text-[#2D2926] pt-1">9. Suspensión del Servicio</h2>
            <p className="text-xs text-[#2D2926]/90">
              El titular de la aplicación podrá suspender o cancelar el acceso de cualquier Usuario que incumpla estos Términos y Condiciones, sin obligación de otorgar previo aviso.
            </p>

            <h2 className="text-sm font-bold text-[#2D2926] pt-1">10. Limitación de Responsabilidad</h2>
            <p className="text-xs text-[#2D2926]/90">
              El Usuario reconoce que utiliza la aplicación bajo su propia responsabilidad. El titular de la aplicación no garantiza la ausencia absoluta de errores, interrupciones o fallos técnicos, aunque realizará esfuerzos razonables para mantener el servicio disponible y seguro.
            </p>

            <h2 className="text-sm font-bold text-[#2D2926] pt-1">11. Modificaciones</h2>
            <p className="text-xs text-[#2D2926]/90">
              Estos Términos y Condiciones podrán modificarse en cualquier momento. Las nuevas versiones serán publicadas dentro de la aplicación y entrarán en vigencia desde su publicación.
            </p>

            <h2 className="text-sm font-bold text-[#2D2926] pt-1">12. Aceptación</h2>
            <p className="text-xs text-[#2D2926]/90">
              Al crear una cuenta o utilizar la aplicación, el Usuario declara expresamente que ha leído y comprendido estos Términos y Condiciones, acepta el tratamiento de la información necesaria, es responsable de los datos ingresados y se compromete a no realizar actividades que vulneren la seguridad o la propiedad intelectual.
            </p>
          </article>

        </div>

        {/* Footer Confirmation Controls */}
        <div className="p-4 bg-[#EFE9E2] rounded-b-sm space-y-3 shrink-0">
          
          {!isReadOnlyMode ? (
            <>
              <label className="flex items-start gap-2.5 cursor-pointer text-xs font-bold text-[#2D2926] bg-[#F7F3EF] p-3 rounded-sm border border-[#2D2926]/20 hover:border-[#2D2926]/50 transition">
                <input
                  type="checkbox"
                  checked={hasAgreed}
                  onChange={(e) => setHasAgreed(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[#2D2926] shrink-0"
                />
                <span>
                  He leído, comprendo y acepto íntegramente todos los Términos y Condiciones de Uso del sistema de PROYECT COMPANY.
                </span>
              </label>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-[#2D2926]/60 font-medium hidden sm:inline">
                  Debes marcar la casilla para habilitar el acceso.
                </span>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!hasAgreed}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#2D2926] hover:bg-[#403C39] text-white font-bold text-xs uppercase tracking-widest rounded-sm transition shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Aceptar y Continuar</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onCloseReadOnly}
                className="px-5 py-2 bg-[#2D2926] text-white font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-[#403C39]"
              >
                Cerrar Lectura
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
