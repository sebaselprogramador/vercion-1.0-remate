// Remate — Cuestionario para vendedores de TikTok LIVE (Parte A, ítems A1–A20)
// Reconstruye el formulario existente: borra sus preguntas y vuelve a crearlas.
// El formulario queda CERRADO. Ábrelo tras la validación: Respuestas > Aceptar respuestas.

const FORM_ID = '1JLb6r1rsYCYh5A8OGBs5FgIrthPcUWoYd9_YX4hLb2E';

function reconstruirFormulario() {
  const form = FormApp.openById(FORM_ID);

  form.getItems().forEach(function (item) { form.deleteItem(item); });

  form.setTitle('Remate — Cómo se vende y se subasta en TikTok LIVE (vendedores de Cochabamba)');
  form.setDescription(
    'Mi nombre es Sebastian Aldo Rocha Veizaga, estudiante de Ingeniería de Sistemas de la ' +
    'Universidad Privada Franz Tamayo. Estoy desarrollando un proyecto académico llamado Remate, ' +
    'sobre subastas realizadas durante transmisiones en vivo de TikTok en Cochabamba.\n\n' +
    'Este cuestionario está dirigido a vendedores mayores de edad que realizan subastas o remates ' +
    'en sus lives. Responderlo toma entre 7 y 10 minutos. No hay respuestas correctas o incorrectas: ' +
    'nos interesa conocer cómo le compran sus clientes y qué dificultades encuentra.\n\n' +
    'Su participación es voluntaria y no recibirá pago. Al enviar sus respuestas, acepta participar. ' +
    'Puede dejar el cuestionario en cualquier momento antes de enviarlo.\n\n' +
    'El nombre de su tienda se usará solo para evitar respuestas duplicadas y, si lo autoriza, para ' +
    'coordinar una entrevista. No se publicará: los resultados se presentarán con códigos y sin ' +
    'datos que permitan identificar a su tienda ni a sus clientes.'
  );
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setProgressBar(true);
  form.setConfirmationMessage('Gracias por su tiempo y por su ayuda con este proyecto académico.');

  const SIGUE = FormApp.PageNavigationType.CONTINUE;
  const FIN = FormApp.PageNavigationType.SUBMIT;
  const FRECUENCIA = ['Nunca', 'Pocas veces', 'Varias veces', 'Casi siempre'];

  // ── Sección 1: tienda y ventas en TikTok LIVE ─────────────────────────────
  form.addTextItem()
    .setTitle('A1. ¿Cuál es el nombre de su tienda o cuenta de TikTok?')
    .setRequired(true);

  const a2 = form.addMultipleChoiceItem()
    .setTitle('A2. ¿Vende productos mediante transmisiones en vivo (lives) de TikTok?')
    .setRequired(true);
  a2.setChoices([
    a2.createChoice('Sí, actualmente', SIGUE),
    a2.createChoice('Sí, pero dejé de hacerlo hace menos de 6 meses', SIGUE),
    a2.createChoice('No', FIN),
  ]);

  // ── Sección 2: subastas ───────────────────────────────────────────────────
  form.addPageBreakItem()
    .setTitle('Subastas')
    .setHelpText('En este cuestionario, "subasta" o "remate" significa vender un producto al comprador ' +
                 'que ofrece el mayor monto durante un tiempo definido.');
  const a3 = form.addMultipleChoiceItem()
    .setTitle('A3. ¿Realiza subastas o remates durante sus lives?')
    .setRequired(true);
  a3.setChoices([
    a3.createChoice('Sí', SIGUE),
    a3.createChoice('No estoy seguro', SIGUE),
    a3.createChoice('No', FIN),
  ]);

  // ── Sección 3: ubicación ──────────────────────────────────────────────────
  form.addPageBreakItem().setTitle('Ubicación');
  const a4 = form.addMultipleChoiceItem()
    .setTitle('A4. ¿Desde dónde realiza principalmente sus ventas?')
    .setRequired(true);
  a4.setChoices([
    a4.createChoice('Municipio de Cochabamba', SIGUE),
    a4.createChoice('Otro municipio del departamento de Cochabamba', FIN),
    a4.createChoice('Otra ciudad', FIN),
  ]);

  // ── Sección 4: su actividad ───────────────────────────────────────────────
  form.addPageBreakItem().setTitle('Su actividad de venta');
  form.addCheckboxItem()
    .setTitle('A5. ¿Qué tipo de productos vende?')
    .setHelpText('Puede marcar varias opciones.')
    .setChoiceValues(['Ropa y calzado', 'Accesorios y joyería', 'Tecnología y celulares',
                      'Artículos para el hogar', 'Belleza y cuidado personal', 'Productos de segunda mano'])
    .showOtherOption(true)
    .setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle('A6. ¿Con qué frecuencia realiza lives de venta?')
    .setChoiceValues(['Varias veces por semana', 'Una vez por semana', 'Una a tres veces por mes',
                      'Menos de una vez por mes'])
    .setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle('A7. Aproximadamente, ¿cuántas personas suelen estar conectadas durante sus lives de venta?')
    .setChoiceValues(['Menos de 20', 'Entre 20 y 50', 'Entre 51 y 100', 'Entre 101 y 300', 'Más de 300', 'No lo sé'])
    .setRequired(true);

  // ── Sección 5: cómo le compran durante el live ────────────────────────────
  form.addPageBreakItem().setTitle('Cómo le compran durante el live');
  form.addCheckboxItem()
    .setTitle('A8. Durante sus subastas, ¿por qué medios le hacen llegar las ofertas?')
    .setHelpText('Puede marcar varias opciones.')
    .setChoiceValues(['Comentarios del live', 'Mensajes privados de TikTok', 'WhatsApp', 'Llamada telefónica'])
    .showOtherOption(true)
    .setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle('A9. De esos medios, ¿cuál es el principal?')
    .setChoiceValues(['Comentarios del live', 'Mensajes privados de TikTok', 'WhatsApp', 'Llamada telefónica'])
    .showOtherOption(true)
    .setRequired(true);
  form.addCheckboxItem()
    .setTitle('A10. ¿Cómo registra las ofertas durante el live?')
    .setHelpText('Puede marcar varias opciones.')
    .setChoiceValues(['No las anoto, las sigo en la pantalla', 'Las anoto en papel', 'Las anoto en el celular',
                      'Tomo capturas de pantalla', 'Otra persona me ayuda a anotarlas'])
    .showOtherOption(true)
    .setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle('A11. Normalmente, ¿cómo decide quién gana una subasta?')
    .setChoiceValues(['Gana la oferta más alta cuando termina una cuenta regresiva',
                      'Gana la oferta más alta al terminar un tiempo fijo',
                      'Gana quien ofrece primero un monto que yo considero suficiente'])
    .showOtherOption(true)
    .setRequired(true);

  // ── Sección 6: dificultades durante el live ───────────────────────────────
  form.addPageBreakItem()
    .setTitle('Dificultades durante el live')
    .setHelpText('Piense en las subastas que realizó en los últimos 3 meses.');
  form.addGridItem()
    .setTitle('A12. ¿Con qué frecuencia le ocurrió lo siguiente durante sus subastas?')
    .setRows([
      'Una oferta pasó desapercibida entre los comentarios',
      'Los comentarios aparecieron con retraso o en desorden',
      'Dos personas dijeron haber ofrecido el mismo monto o haber ofrecido primero',
      'Un comprador reclamó que su oferta no fue tomada en cuenta',
      'Alguien ofreció sin intención real de comprar',
    ])
    .setColumns(FRECUENCIA)
    .setRequired(true);
  form.addParagraphTextItem()
    .setTitle('A13. Describa brevemente la última dificultad que tuvo para identificar una oferta o al ganador.')
    .setHelpText('Si no ha tenido dificultades, escriba "ninguna".')
    .setRequired(true);

  // ── Sección 7: pagos después de la subasta ────────────────────────────────
  form.addPageBreakItem()
    .setTitle('Después de la subasta: pagos')
    .setHelpText('Piense en las ventas por subasta de los últimos 3 meses.');
  form.addCheckboxItem()
    .setTitle('A14. ¿Cómo le pagan normalmente los ganadores?')
    .setHelpText('Puede marcar varias opciones.')
    .setChoiceValues(['Pago por QR o transferencia bancaria', 'Efectivo al momento de la entrega',
                      'Depósito bancario', 'Billetera móvil'])
    .showOtherOption(true)
    .setRequired(true);
  form.addGridItem()
    .setTitle('A15. ¿Con qué frecuencia le ocurrió lo siguiente después de una subasta?')
    .setRows([
      'El ganador no pagó ni respondió',
      'El ganador se retractó de la compra',
      'Recibió un comprobante de pago falso o alterado',
      'El comprador dijo que pagó, pero el dinero no llegó',
      'El pago llegó incompleto',
    ])
    .setColumns(FRECUENCIA)
    .setRequired(true);
  form.addCheckboxItem()
    .setTitle('A16. ¿Qué hace normalmente cuando el ganador no paga?')
    .setHelpText('Puede marcar varias opciones.')
    .setChoiceValues(['Ofrezco el producto a la segunda oferta más alta', 'Vuelvo a subastar el producto',
                      'Bloqueo o reporto al comprador', 'No hago nada', 'Nunca me ha pasado'])
    .showOtherOption(true)
    .setRequired(true);
  const a17 = form.addMultipleChoiceItem()
    .setTitle('A17. ¿Ha sufrido alguna estafa relacionada con una venta realizada en sus lives?')
    .setRequired(true);

  const paginaEstafa = form.addPageBreakItem().setTitle('Detalle de la estafa');
  form.addParagraphTextItem()
    .setTitle('A18. Describa brevemente qué ocurrió.')
    .setHelpText('No incluya nombres, números de teléfono ni datos de otras personas.')
    .setRequired(true);

  const paginaEntrevista = form.addPageBreakItem().setTitle('Entrevista');
  a17.setChoices([
    a17.createChoice('Sí', paginaEstafa),
    a17.createChoice('No', paginaEntrevista),
    a17.createChoice('Prefiero no responder', paginaEntrevista),
  ]);

  // ── Sección 9: entrevista ─────────────────────────────────────────────────
  const a19 = form.addMultipleChoiceItem()
    .setTitle('A19. ¿Aceptaría una entrevista de 20 a 30 minutos sobre cómo realiza sus subastas?')
    .setRequired(true);
  a19.setChoices([
    a19.createChoice('Sí, por llamada o videollamada de WhatsApp', SIGUE),
    a19.createChoice('Sí, presencial', SIGUE),
    a19.createChoice('No', FIN),
  ]);

  // ── Sección 10: contacto ──────────────────────────────────────────────────
  form.addPageBreakItem()
    .setTitle('Datos para coordinar la entrevista')
    .setHelpText('Estos datos se usarán solo para coordinar la entrevista y se guardarán separados de sus respuestas.');
  form.addTextItem().setTitle('A20. Nombre de la persona de contacto').setRequired(true);
  form.addTextItem()
    .setTitle('A20. Número de WhatsApp')
    .setValidation(
      FormApp.createTextValidation()
        .requireTextMatchesPattern('^\\+?[0-9 ]{7,15}$')
        .setHelpText('Escriba solo números, por ejemplo 70123456.')
        .build()
    )
    .setRequired(true);

  form.setAcceptingResponses(false);

  Logger.log('Preguntas creadas: ' + form.getItems().length);
  Logger.log('Editar el formulario: ' + form.getEditUrl());
}
