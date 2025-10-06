package group3.en.stuattendance.service;

import group3.en.stuattendance.dto.SessionDto;
import group3.en.stuattendance.model.Session;

import java.time.LocalDate;
import java.util.List;

public interface SessionService {
    Session createSession(SessionDto dto);
    Session updateSession(Integer sessionId, SessionDto dto);
    void deleteSession(Integer sessionId);
    String generateQRCode(Integer sessionId);
    boolean validateQRCode(String qrCode);
    boolean validateLocation(Integer sessionId, String studentLocation);
    List<Session> getSessionsByDate(LocalDate date);
    List<Session> getSessionsByCourse(Integer courseId);
}