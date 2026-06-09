Feature: Inicio de Sesión
  Como usuario de la aplicación de firma
  Quiero iniciar sesión con credenciales válidas
  Para acceder a la página de documentos

  Scenario: Usuario inicia sesión con credenciales válidas
    Given que Usuario está en la página de inicio de sesión
    When Usuario ingresa su email y contraseña
    Then Usuario debería ser redirigido a la página de documentos
