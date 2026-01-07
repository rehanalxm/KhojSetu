package com.lostandfound.backend.service;

import com.sendgrid.*;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
public class EmailService {

    @Value("${sendgrid.api.key}")
    private String sendGridApiKey;

    @Value("${sendgrid.from.email:noreply@khojsetu.com}")
    private String fromEmail;

    public void sendOtpEmail(String toEmail, String otp) throws IOException {
        Email from = new Email(fromEmail);
        String subject = "Password Reset OTP - KhojSetu";
        Email to = new Email(toEmail);

        String htmlContent = buildOtpEmailHtml(otp);
        Content content = new Content("text/html", htmlContent);

        Mail mail = new Mail(from, subject, to, content);

        SendGrid sg = new SendGrid(sendGridApiKey);
        Request request = new Request();

        try {
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            Response response = sg.api(request);
            System.out.println("Email sent! Status code: " + response.getStatusCode());
        } catch (IOException ex) {
            throw new IOException("Failed to send email: " + ex.getMessage());
        }
    }

    private String buildOtpEmailHtml(String otp) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "<style>" +
                "body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }" +
                ".container { max-width: 600px; margin: 50px auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }"
                +
                "h1 { color: #6366f1; text-align: center; }" +
                ".otp-box { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 10px; letter-spacing: 8px; margin: 30px 0; }"
                +
                "p { color: #333; line-height: 1.6; }" +
                ".footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "<div class='container'>" +
                "<h1>🔐 Password Reset Request</h1>" +
                "<p>Hello,</p>" +
                "<p>We received a request to reset your password for your KhojSetu account. Use the OTP code below to complete the process:</p>"
                +
                "<div class='otp-box'>" + otp + "</div>" +
                "<p><strong>This OTP is valid for 10 minutes.</strong></p>" +
                "<p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>" +
                "<div class='footer'>" +
                "<p>© 2026 KhojSetu - Lost & Found Platform</p>" +
                "</div>" +
                "</div>" +
                "</body>" +
                "</html>";
    }
}
