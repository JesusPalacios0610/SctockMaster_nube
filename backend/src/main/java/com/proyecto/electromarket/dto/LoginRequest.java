package com.proyecto.electromarket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class LoginRequest {

    @NotBlank(message = "Ingresa tu usuario.")
    @Size(max = 50, message = "El usuario no puede superar 50 caracteres.")
    private String usuario;

    @NotBlank(message = "Ingresa tu contraseña.")
    @Size(max = 72, message = "La contraseña no puede superar 72 caracteres.")
    private String contrasena;

    public String getUsuario() {
        return usuario;
    }

    public void setUsuario(String usuario) {
        this.usuario = usuario;
    }

    public String getContrasena() {
        return contrasena;
    }

    public void setContrasena(String contrasena) {
        this.contrasena = contrasena;
    }
}
