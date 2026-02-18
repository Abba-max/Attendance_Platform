package group3.en.stuattendance.Institutionmanager.Service;

import group3.en.stuattendance.Institutionmanager.Model.Cycle;
import java.util.List;

public interface CycleService {
    Cycle save(Cycle cycle);
    Cycle findById(Integer id);
    List<Cycle> getAllCycles();
    void deleteById(Integer id);
}