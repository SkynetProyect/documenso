Feature: Rechazo de Documento
  Como firmante
  Quiero rechazar un documento con un motivo válido
  Para que el documento quede marcado como rechazado

  Scenario: Usuario rechaza un documento
    Given que Usuario tiene un documento listo para firmar
    When Usuario rechaza el documento con motivo "motivo de rechazo"
    Then el documento debería quedar marcado como rechazado

  # --- Sello de rechazo (caja negra sobre addRejectionStampToPdf) ---

  Scenario: El PDF rechazado contiene el sello DOCUMENT REJECTED
    Given que Usuario tiene un documento listo para firmar
    When Usuario rechaza el documento con motivo "documento incorrecto"
    And Usuario abre el documento rechazado desde la lista de documentos
    Then el PDF debe mostrar el sello "DOCUMENT REJECTED"
    And se registra una instantánea visual "documento-rechazado-sello" para Argos

  Scenario: El documento rechazado se refleja en la lista y conserva el sello en el PDF
    Given que Usuario tiene un documento listo para firmar
    When Usuario rechaza el documento con motivo "documento incorrecto"
    Then la lista de documentos debe mostrar el estado "Rejected" para el documento más reciente
    When Usuario abre el documento rechazado desde la lista de documentos
    Then el PDF debe mostrar el sello "DOCUMENT REJECTED"
    And se registra una instantánea visual "documento-rechazado-lista" para Argos

  Scenario: El sello de rechazo ignora el motivo proporcionado por el firmante
    Given que Usuario tiene un documento listo para firmar
    When Usuario rechaza el documento con motivo "<script>alert(1)</script> motivo malicioso"
    And Usuario abre el documento rechazado desde la lista de documentos
    Then el PDF debe mostrar el sello "DOCUMENT REJECTED"
    And el PDF no debe mostrar el motivo del rechazo como sello
