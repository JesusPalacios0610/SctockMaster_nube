package com.proyecto.electromarket.security;

import com.proyecto.electromarket.entity.Usuario;
import com.proyecto.electromarket.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
public class AdminAccountInitializer implements ApplicationRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final String username;
    private final String name;
    private final String password;

    public AdminAccountInitializer(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap.admin.username:}") String username,
            @Value("${app.bootstrap.admin.name:}") String name,
            @Value("${app.bootstrap.admin.password:}") String password) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.username = username.trim();
        this.name = name.trim();
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (usuarioRepository.count() > 0) {
            return;
        }

        if (username.isBlank() || name.isBlank() || password.isBlank()) {
            throw new IllegalStateException(
                    "No hay usuarios registrados. Define APP_ADMIN_USERNAME, APP_ADMIN_NAME y APP_ADMIN_PASSWORD para crear el administrador inicial.");
        }
        if (username.length() > 50 || name.length() > 100) {
            throw new IllegalStateException("El usuario inicial debe respetar los límites de la base de datos.");
        }
        int passwordBytes = password.getBytes(StandardCharsets.UTF_8).length;
        if (passwordBytes < 12 || passwordBytes > 72) {
            throw new IllegalStateException("APP_ADMIN_PASSWORD debe tener entre 12 y 72 bytes UTF-8.");
        }

        usuarioRepository.save(new Usuario(name, username, passwordEncoder.encode(password), "ADMIN"));
    }
}
