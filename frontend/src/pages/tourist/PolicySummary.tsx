import { useI18n } from '../../i18n/I18nContext';

export default function PolicySummary() {
  const { pick } = useI18n();
  return (
    <div className="policy">
      <h3 className="h3">
        {pick('Políticas de la reserva', 'Booking policies')}
      </h3>
      <ul>
        <li>
          {pick(
            'Si cancelas con 7 días o más, recibes el 100 %. De 3 a 6 días, el 50 %. Con menos de 3 días no hay reembolso.',
            'If you cancel 7 days or more ahead, you get 100%. From 3 to 6 days, 50%. With less than 3 days there is no refund.',
          )}
        </li>
        <li>
          {pick(
            'Si el guía no reconfirma a tiempo, puedes cancelar con el 100 %. Si el proveedor cancela, recibes el 100 %.',
            'If the guide does not reconfirm in time, you can cancel with 100%. If the provider cancels, you get 100%.',
          )}
        </li>
        <li>
          {pick(
            'En salidas grupales, si no se alcanza el mínimo de personas, recibes el 100 %.',
            'On group departures, if the minimum is not reached, you get 100%.',
          )}
        </li>
        <li>
          {pick(
            'Durante el tour puedes pedir ayuda a Peak Paz cuando tengas señal.',
            'During the tour you can ask Peak Paz for help whenever you have signal.',
          )}
        </li>
        <li>
          {pick(
            'Puedes presentar un reclamo desde el inicio del tour hasta 72 horas después del final. Mientras se revisa, el pago al proveedor queda retenido.',
            'You can file a complaint from the start of the tour until 72 hours after it ends. While it is reviewed, the provider payment is on hold.',
          )}
        </li>
        <li>
          {pick(
            'Si se comprueba que el guía no llegó, recibes el 100 % y el guía es sancionado.',
            'If it is proven that the guide did not arrive, you get 100% and the guide is sanctioned.',
          )}
        </li>
      </ul>
    </div>
  );
}
