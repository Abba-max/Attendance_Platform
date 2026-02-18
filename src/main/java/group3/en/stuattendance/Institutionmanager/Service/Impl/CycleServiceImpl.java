package group3.en.stuattendance.Institutionmanager.Service.Impl;

import group3.en.stuattendance.Institutionmanager.Model.Cycle;
import group3.en.stuattendance.Institutionmanager.Repository.CycleRepository;
import group3.en.stuattendance.Institutionmanager.Service.CycleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class CycleServiceImpl implements CycleService {

    @Autowired
    private CycleRepository cycleRepository;

    @Override
    public Cycle save(Cycle cycle) {
        return cycleRepository.save(cycle);
    }

    @Override
    public Cycle findById(Integer id) {
        return cycleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cycle not found with id: " + id));
    }

    @Override
    public List<Cycle> getAllCycles() {
        return cycleRepository.findAll();
    }

    @Override
    public void deleteById(Integer id) {
        cycleRepository.deleteById(id);
    }
}