Feature: Rechazo de Documento
  Como firmante
  Quiero rechazar un documento con un motivo válido
  Para que el documento quede marcado como rechazado

  Scenario: Usuario rechaza un documento
    Given que Usuario tiene un documento listo para firmar
    When Usuario rechaza el documento con motivo "motivo de rechazo"
    Then el documento debería quedar marcado como rechazado
