package com.proyecto.electromarket.controller;

import com.proyecto.electromarket.dto.AuthUserResponse;
import com.proyecto.electromarket.dto.ErrorResponse;
import com.proyecto.electromarket.dto.LoginRequest;
import com.proyecto.electromarket.dto.LoginResponse;
import com.proyecto.electromarket.security.UsuarioPrincipal;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtEncoder jwtEncoder;
    private final long jwtTtlMinutes;

    public AuthController(
            AuthenticationManager authenticationManager,
            JwtEncoder jwtEncoder,
            @Value("${app.security.jwt-ttl-minutes:480}") long jwtTtlMinutes) {
        if (jwtTtlMinutes < 5 || jwtTtlMinutes > 1440) {
            throw new IllegalStateException("JWT_TTL_MINUTES debe estar entre 5 y 1440.");
        }
        this.authenticationManager = authenticationManager;
        this.jwtEncoder = jwtEncoder;
        this.jwtTtlMinutes = jwtTtlMinutes;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        final Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(
                            request.getUsuario().trim(), request.getContrasena()));
        } catch (BadCredentialsException exception) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Usuario o contraseña incorrectos."));
        }

        if (!(authentication.getPrincipal() instanceof UsuarioPrincipal usuario)) {
            throw new AuthenticationServiceException("No se pudo cargar el usuario autenticado.");
        }

        Instant now = Instant.now();
        Instant expiresAt = now.plus(Duration.ofMinutes(jwtTtlMinutes));
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("electromarket")
                .issuedAt(now)
                .expiresAt(expiresAt)
                .subject(usuario.getUsername())
                .claim("uid", usuario.getIdUsuario())
                .claim("name", usuario.getNombre())
                .claim("role", usuario.getRol())
                .build();
        String accessToken = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();

        return ResponseEntity.ok(new LoginResponse(accessToken, expiresAt, userResponse(usuario)));
    }

    @GetMapping("/me")
    public AuthUserResponse currentUser(@AuthenticationPrincipal Jwt jwt) {
        Integer idUsuario = jwt.<Number>getClaim("uid").intValue();
        return new AuthUserResponse(
                idUsuario,
                jwt.getClaimAsString("name"),
                jwt.getSubject(),
                jwt.getClaimAsString("role"));
    }

    private AuthUserResponse userResponse(UsuarioPrincipal usuario) {
        return new AuthUserResponse(usuario.getIdUsuario(), usuario.getNombre(), usuario.getUsername(), usuario.getRol());
    }
}
