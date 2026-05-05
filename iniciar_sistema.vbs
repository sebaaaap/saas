' =============================================================
' VANKAY - Lanzador silencioso del sistema
' Este archivo inicia el sistema SIN mostrar ventana de terminal
' El cliente solo verá que se abre el navegador automaticamente
' =============================================================

Dim WshShell
Set WshShell = CreateObject("WScript.Shell")

' Ruta del bat relativa al vbs (ambos deben estar en la misma carpeta)
Dim scriptDir
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Ejecutar el .bat sin ventana visible (0 = oculto, False = no esperar)
WshShell.Run "cmd /c """ & scriptDir & "\iniciar_sistema.bat""", 0, False

Set WshShell = Nothing
