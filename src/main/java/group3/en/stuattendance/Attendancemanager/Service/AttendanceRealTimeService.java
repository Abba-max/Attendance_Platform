package group3.en.stuattendance.Attendancemanager.Service;

import group3.en.stuattendance.Attendancemanager.DTO.AttendanceRecordDto;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class AttendanceRealTimeService {

    // sessionID -> List of Emitters (Teachers monitoring that session)
    private final Map<Integer, List<SseEmitter>> monitors = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Integer sessionId) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        
        monitors.computeIfAbsent(sessionId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(sessionId, emitter));
        emitter.onTimeout(() -> removeEmitter(sessionId, emitter));
        emitter.onError((e) -> removeEmitter(sessionId, emitter));

        return emitter;
    }

    public void dispatch(Integer sessionId, AttendanceRecordDto record) {
        List<SseEmitter> emitters = monitors.get(sessionId);
        if (emitters != null) {
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event()
                            .name("CHECKIN")
                            .data(record));
                } catch (Exception e) {
                    removeEmitter(sessionId, emitter);
                }
            }
        }
    }

    private void removeEmitter(Integer sessionId, SseEmitter emitter) {
        List<SseEmitter> emitters = monitors.get(sessionId);
        if (emitters != null) {
            emitters.remove(emitter);
        }
    }
}
