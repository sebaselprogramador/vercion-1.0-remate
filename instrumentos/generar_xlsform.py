"""Genera el XLSForm de la encuesta a vendedores (A1–A18) para KoboToolbox."""
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

salida = sys.argv[1]

ELEGIBLE = "${elegible} = 1"
FREC = "frecuencia"

survey = [
    # type, name, label, hint, required, relevant, constraint, constraint_message, appearance, choice_filter, calculation
    # Metadatos: hora de inicio y de envío de cada respuesta (registro del consentimiento y duración).
    ("start", "inicio", "", "", "", "", "", "", "", "", ""),
    ("end", "fin", "", "", "", "", "", "", "", "", ""),
    ("note", "presentacion",
     "**Remate — Cómo se vende y se subasta en TikTok LIVE (vendedores de Cochabamba)**\n\n"
     "Mi nombre es Sebastian Aldo Rocha Veizaga, estudiante de Ingeniería de Sistemas de la Universidad Privada "
     "Franz Tamayo. Estoy desarrollando un proyecto académico llamado Remate, sobre subastas realizadas durante "
     "transmisiones en vivo de TikTok en Cochabamba.\n\n"
     "Este cuestionario está dirigido a vendedores mayores de edad que realizan subastas o remates en sus lives. "
     "Responderlo toma entre 7 y 10 minutos. No hay respuestas correctas o incorrectas: nos interesa conocer cómo "
     "le compran sus clientes y qué dificultades encuentra.\n\n"
     "Su participación es voluntaria y no recibirá pago. Al enviar sus respuestas, acepta participar. Puede dejar "
     "el cuestionario en cualquier momento antes de enviarlo.\n\n"
     "El nombre de su tienda se usará solo para evitar respuestas duplicadas. No se publicará: los resultados se "
     "presentarán con códigos y sin datos que permitan identificar a su tienda ni a sus clientes.",
     "", "", "", "", "", "", "", ""),

    ("begin_group", "s1_tienda", "Su tienda", "", "", "", "", "", "field-list", "", ""),
    ("text", "a1", "A1. ¿Cuál es el nombre de su tienda o cuenta de TikTok?", "", "yes", "", "", "", "", "", ""),
    ("select_one vende_live", "a2", "A2. ¿Vende productos mediante transmisiones en vivo (lives) de TikTok?", "", "yes", "", "", "", "", "", ""),
    ("end_group", "", "", "", "", "", "", "", "", "", ""),

    ("begin_group", "s2_subastas", "Subastas",
     "En este cuestionario, \"subasta\" o \"remate\" significa vender un producto al comprador que ofrece el mayor "
     "monto durante un tiempo definido.", "", "${a2} != 'no'", "", "", "field-list", "", ""),
    ("select_one subasta", "a3", "A3. ¿Realiza subastas o remates durante sus lives?", "", "yes", "", "", "", "", "", ""),
    ("end_group", "", "", "", "", "", "", "", "", "", ""),

    ("begin_group", "s3_ubicacion", "Ubicación", "", "", "${a2} != 'no' and ${a3} != 'no'", "", "", "field-list", "", ""),
    ("select_one ubicacion", "a4", "A4. ¿Desde dónde realiza principalmente sus ventas?", "", "yes", "", "", "", "", "", ""),
    ("end_group", "", "", "", "", "", "", "", "", "", ""),

    # Criterios de inclusión: vende por live (o dejó hace menos de 6 meses), subasta (o no está seguro) y vende desde el municipio de Cochabamba.
    ("calculate", "elegible", "", "", "", "", "", "", "", "",
     "if(${a2} != '' and ${a2} != 'no' and ${a3} != '' and ${a3} != 'no' and ${a4} = 'cochabamba', 1, 0)"),
    ("note", "fin_no_elegible",
     "Gracias por su tiempo. Este cuestionario está dirigido a vendedores que realizan subastas en sus lives de "
     "TikTok desde el municipio de Cochabamba, por lo que no necesitamos más respuestas. Ya puede enviar el formulario.",
     "", "", "${a2} = 'no' or ${a3} = 'no' or (${a4} != '' and ${a4} != 'cochabamba')", "", "", "", "", ""),

    ("begin_group", "s4_actividad", "Su actividad de venta", "", "", ELEGIBLE, "", "", "field-list", "", ""),
    ("select_multiple productos", "a5", "A5. ¿Qué tipo de productos vende?", "Puede marcar varias opciones.", "yes", "", "", "", "", "", ""),
    ("text", "a5_otro", "A5. Especifique qué otro tipo de productos vende", "", "yes", "selected(${a5}, 'otro')", "", "", "", "", ""),
    ("select_one frecuencia_live", "a6", "A6. ¿Con qué frecuencia realiza lives de venta?", "", "yes", "", "", "", "", "", ""),
    ("select_one audiencia", "a7", "A7. Aproximadamente, ¿cuántas personas suelen estar conectadas durante sus lives de venta?", "", "yes", "", "", "", "", "", ""),
    ("end_group", "", "", "", "", "", "", "", "", "", ""),

    ("begin_group", "s5_compra", "Cómo le compran durante el live", "", "", ELEGIBLE, "", "", "field-list", "", ""),
    ("select_multiple medios", "a8", "A8. Durante sus subastas, ¿por qué medios le hacen llegar las ofertas?", "Puede marcar varias opciones.", "yes", "", "", "", "", "", ""),
    ("text", "a8_otro", "A8. Especifique el otro medio", "", "yes", "selected(${a8}, 'otro')", "", "", "", "", ""),
    ("select_one medios", "a9", "A9. De esos medios, ¿cuál es el principal?", "Solo aparecen los medios que marcó en A8.", "yes", "", "", "", "", "selected(${a8}, name)", ""),
    ("select_multiple registro", "a10", "A10. ¿Cómo registra las ofertas durante el live?", "Puede marcar varias opciones.", "yes", "", "", "", "", "", ""),
    ("text", "a10_otro", "A10. Especifique la otra forma de registrar las ofertas", "", "yes", "selected(${a10}, 'otro')", "", "", "", "", ""),
    ("select_one decide_ganador", "a11", "A11. Normalmente, ¿cómo decide quién gana una subasta?", "", "yes", "", "", "", "", "", ""),
    ("text", "a11_otro", "A11. Especifique cómo decide quién gana", "", "yes", "${a11} = 'otro'", "", "", "", "", ""),
    ("end_group", "", "", "", "", "", "", "", "", "", ""),

    ("begin_group", "s6_dificultades", "Dificultades durante el live", "Piense en las subastas que realizó en los últimos 3 meses.", "", ELEGIBLE, "", "", "field-list", "", ""),
    ("begin_group", "a12", "A12. ¿Con qué frecuencia le ocurrió lo siguiente durante sus subastas?", "", "", "", "", "", "table-list", "", ""),
    (f"select_one {FREC}", "a12_1", "Una oferta pasó desapercibida entre los comentarios", "", "yes", "", "", "", "", "", ""),
    (f"select_one {FREC}", "a12_2", "Los comentarios aparecieron con retraso o en desorden", "", "yes", "", "", "", "", "", ""),
    (f"select_one {FREC}", "a12_3", "Dos personas dijeron haber ofrecido el mismo monto o haber ofrecido primero", "", "yes", "", "", "", "", "", ""),
    (f"select_one {FREC}", "a12_4", "Un comprador reclamó que su oferta no fue tomada en cuenta", "", "yes", "", "", "", "", "", ""),
    (f"select_one {FREC}", "a12_5", "Alguien ofreció sin intención real de comprar", "", "yes", "", "", "", "", "", ""),
    ("end_group", "", "", "", "", "", "", "", "", "", ""),
    ("text", "a13", "A13. Describa brevemente la última dificultad que tuvo para identificar una oferta o al ganador.",
     "Si no ha tenido dificultades, escriba \"ninguna\".", "yes", "", "", "", "multiline", "", ""),
    ("end_group", "", "", "", "", "", "", "", "", "", ""),

    ("begin_group", "s7_pagos", "Después de la subasta: pagos", "Piense en las ventas por subasta de los últimos 3 meses.", "", ELEGIBLE, "", "", "field-list", "", ""),
    ("select_multiple medios_pago", "a14", "A14. ¿Cómo le pagan normalmente los ganadores?", "Puede marcar varias opciones.", "yes", "", "", "", "", "", ""),
    ("text", "a14_otro", "A14. Especifique el otro medio de pago", "", "yes", "selected(${a14}, 'otro')", "", "", "", "", ""),
    ("begin_group", "a15", "A15. ¿Con qué frecuencia le ocurrió lo siguiente después de una subasta?", "", "", "", "", "", "table-list", "", ""),
    (f"select_one {FREC}", "a15_1", "El ganador no pagó ni respondió", "", "yes", "", "", "", "", "", ""),
    (f"select_one {FREC}", "a15_2", "El ganador se retractó de la compra", "", "yes", "", "", "", "", "", ""),
    (f"select_one {FREC}", "a15_3", "Recibió un comprobante de pago falso o alterado", "", "yes", "", "", "", "", "", ""),
    (f"select_one {FREC}", "a15_4", "El comprador dijo que pagó, pero el dinero no llegó", "", "yes", "", "", "", "", "", ""),
    (f"select_one {FREC}", "a15_5", "El pago llegó incompleto", "", "yes", "", "", "", "", "", ""),
    ("end_group", "", "", "", "", "", "", "", "", "", ""),
    ("select_multiple sin_pago", "a16", "A16. ¿Qué hace normalmente cuando el ganador no paga?", "Puede marcar varias opciones.", "yes", "",
     "not((selected(., 'nunca') or selected(., 'nada')) and count-selected(.) > 1)",
     "\"No hago nada\" y \"Nunca me ha pasado\" no se pueden combinar con otras opciones.", "", "", ""),
    ("text", "a16_otro", "A16. Especifique qué otra cosa hace", "", "yes", "selected(${a16}, 'otro')", "", "", "", "", ""),
    ("select_one estafa", "a17", "A17. ¿Ha sufrido alguna estafa relacionada con una venta realizada en sus lives?", "", "yes", "", "", "", "", "", ""),
    ("text", "a18", "A18. Describa brevemente qué ocurrió.", "No incluya nombres, números de teléfono ni datos de otras personas.",
     "yes", "${a17} = 'si'", "", "", "multiline", "", ""),
    ("end_group", "", "", "", "", "", "", "", "", "", ""),

    ("note", "cierre", "Gracias por su tiempo y por su ayuda con este proyecto académico. Ya puede enviar el formulario.",
     "", "", ELEGIBLE, "", "", "", "", ""),
]

choices = [
    ("vende_live", "actual", "Sí, actualmente"),
    ("vende_live", "dejo_6m", "Sí, pero dejé de hacerlo hace menos de 6 meses"),
    ("vende_live", "no", "No"),
    ("subasta", "si", "Sí"),
    ("subasta", "no_seguro", "No estoy seguro"),
    ("subasta", "no", "No"),
    ("ubicacion", "cochabamba", "Municipio de Cochabamba"),
    ("ubicacion", "otro_municipio", "Otro municipio del departamento de Cochabamba"),
    ("ubicacion", "otra_ciudad", "Otra ciudad"),
    ("productos", "ropa", "Ropa y calzado"),
    ("productos", "accesorios", "Accesorios y joyería"),
    ("productos", "tecnologia", "Tecnología y celulares"),
    ("productos", "hogar", "Artículos para el hogar"),
    ("productos", "belleza", "Belleza y cuidado personal"),
    ("productos", "segunda_mano", "Productos de segunda mano"),
    ("productos", "otro", "Otro"),
    ("frecuencia_live", "varias_semana", "Varias veces por semana"),
    ("frecuencia_live", "una_semana", "Una vez por semana"),
    ("frecuencia_live", "una_tres_mes", "Una a tres veces por mes"),
    ("frecuencia_live", "menos_mes", "Menos de una vez por mes"),
    ("audiencia", "menos_20", "Menos de 20"),
    ("audiencia", "20_50", "Entre 20 y 50"),
    ("audiencia", "51_100", "Entre 51 y 100"),
    ("audiencia", "101_300", "Entre 101 y 300"),
    ("audiencia", "mas_300", "Más de 300"),
    ("audiencia", "no_sabe", "No lo sé"),
    ("medios", "comentarios", "Comentarios del live"),
    ("medios", "mensajes_tiktok", "Mensajes privados de TikTok"),
    ("medios", "whatsapp", "WhatsApp"),
    ("medios", "llamada", "Llamada telefónica"),
    ("medios", "otro", "Otro"),
    ("registro", "no_anoto", "No las anoto, las sigo en la pantalla"),
    ("registro", "papel", "Las anoto en papel"),
    ("registro", "celular", "Las anoto en el celular"),
    ("registro", "capturas", "Tomo capturas de pantalla"),
    ("registro", "ayudante", "Otra persona me ayuda a anotarlas"),
    ("registro", "otro", "Otro"),
    ("decide_ganador", "cuenta_regresiva", "Gana la oferta más alta cuando termina una cuenta regresiva"),
    ("decide_ganador", "tiempo_fijo", "Gana la oferta más alta al terminar un tiempo fijo"),
    ("decide_ganador", "monto_suficiente", "Gana quien ofrece primero un monto que yo considero suficiente"),
    ("decide_ganador", "otro", "Otro"),
    (FREC, "nunca", "Nunca"),
    (FREC, "pocas", "Pocas veces"),
    (FREC, "varias", "Varias veces"),
    (FREC, "casi_siempre", "Casi siempre"),
    ("medios_pago", "qr_transferencia", "Pago por QR o transferencia bancaria"),
    ("medios_pago", "efectivo_entrega", "Efectivo al momento de la entrega"),
    ("medios_pago", "deposito", "Depósito bancario"),
    ("medios_pago", "billetera_movil", "Billetera móvil"),
    ("medios_pago", "otro", "Otro"),
    ("sin_pago", "segunda_oferta", "Ofrezco el producto a la segunda oferta más alta"),
    ("sin_pago", "resubasto", "Vuelvo a subastar el producto"),
    ("sin_pago", "bloqueo", "Bloqueo o reporto al comprador"),
    ("sin_pago", "nada", "No hago nada"),
    ("sin_pago", "nunca", "Nunca me ha pasado"),
    ("sin_pago", "otro", "Otro"),
    ("estafa", "si", "Sí"),
    ("estafa", "no", "No"),
    ("estafa", "prefiero_no", "Prefiero no responder"),
]

settings = [("form_title", "form_id", "version", "style"),
            ("Remate — Encuesta a vendedores de TikTok LIVE (Cochabamba)", "remate_vendedores_tiktok", "2026111201", "pages")]

wb = Workbook()
cab = Font(bold=True, color="FFFFFF")
fondo = PatternFill("solid", fgColor="1D5A42")

def hoja(ws, filas, anchos):
    for fila in filas:
        ws.append(list(fila))
    for c in ws[1]:
        c.font = cab
        c.fill = fondo
    for i, w in enumerate(anchos, start=1):
        ws.column_dimensions[ws.cell(1, i).column_letter].width = w
    for fila in ws.iter_rows(min_row=2):
        for c in fila:
            c.alignment = Alignment(wrap_text=True, vertical="top")
    ws.freeze_panes = "A2"

ws = wb.active
ws.title = "survey"
hoja(ws, [("type", "name", "label", "hint", "required", "relevant", "constraint", "constraint_message",
           "appearance", "choice_filter", "calculation")] + survey,
     [26, 18, 60, 40, 9, 40, 40, 40, 12, 22, 40])
hoja(wb.create_sheet("choices"), [("list_name", "name", "label")] + choices, [18, 20, 60])
hoja(wb.create_sheet("settings"), settings, [50, 28, 14, 10])
wb.save(salida)
print("ok", salida, len(survey), "filas en survey,", len(choices), "opciones")
