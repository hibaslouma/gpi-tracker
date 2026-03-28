package com.gpi.gpi_backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendCredentials(String toEmail, String name, String password) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("gpi.tracker.tn@gmail.com", "GPI Tracker");
            helper.setTo(toEmail);
            helper.setSubject("Vos identifiants GPI Tracker");
            helper.setText(buildTemplate(name, toEmail, password), true);

            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Erreur envoi email: " + e.getMessage());
        }
    }

    private String buildTemplate(String name, String email, String password) {
        return """
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;border:1px solid #eee;border-radius:8px;padding:32px;">
              <h2 style="color:#c0392b;">Bienvenue sur GPI Tracker</h2>
              <p>Bonjour <strong>%s</strong>,</p>
              <p>Votre compte a été créé. Voici vos identifiants :</p>
              <div style="background:#f8f8f8;border-radius:6px;padding:16px;margin:16px 0;">
                <p style="margin:4px 0;"><strong>Email :</strong> %s</p>
                <p style="margin:4px 0;"><strong>Mot de passe :</strong> %s</p>
              </div>
              <p style="color:#e74c3c;font-size:13px;">Veuillez changer votre mot de passe après la première connexion.</p>
              <p style="color:#999;font-size:12px;">L'équipe GPI Tracker</p>
            </div>
        """.formatted(name, email, password);
    }
}