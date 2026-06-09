Feature: Firma de Documento
  Como firmante
  Quiero completar el flujo de firma de un documento
  Para que el documento quede marcado como firmado

  Scenario: Usuario firma un documento exitosamente
    Given que Usuario tiene un documento listo para firmar
    When Usuario navega a la página de firma
    And Usuario completa el campo de firma
    Then el documento debería quedar marcado como firmado
