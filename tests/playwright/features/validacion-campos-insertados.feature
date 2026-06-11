Feature: Validación de campos insertados
  Como firmante
  Quiero que el sistema valide los campos requeridos no insertados
  Para no completar un documento incompleto

  Scenario: Documento sin campos pendientes
    Given que todos los campos requeridos están insertados
    When se ejecuta la validación de campos insertados
    Then la validación debe devolver verdadero
    And el visor PDF no debe conservar la señal de validación

  Scenario: Primer campo pendiente visible en el DOM
    Given que existe un campo requerido sin insertar en el DOM
    When se ejecuta la validación de campos insertados
    Then la validación debe devolver falso
    And el sistema debe desplazar el primer campo pendiente hacia el centro
    And se registra una instantánea visual "campo-pendiente-resaltado" para Argos

  Scenario: Primer campo pendiente virtualizado fuera del DOM
    Given que existe un campo requerido sin insertar fuera del DOM
    And que el contenedor PDF está disponible
    When se ejecuta la validación de campos insertados
    Then la validación debe devolver falso
    And el sistema debe solicitar el salto a la página del campo pendiente
    And se registra una instantánea visual "salto-de-pagina-solicitado" para Argos

  Scenario: Falta el contenedor PDF
    Given que existe un campo requerido sin insertar
    And que el contenedor PDF no está disponible
    When se ejecuta la validación de campos insertados
    Then la validación debe devolver falso
    And el sistema no debe intentar desplazar la página
