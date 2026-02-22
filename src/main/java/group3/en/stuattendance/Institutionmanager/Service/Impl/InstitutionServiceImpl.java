package group3.en.stuattendance.Institutionmanager.Service.Impl;

import group3.en.stuattendance.Auditmanager.Annotation.Auditable;
import group3.en.stuattendance.Institutionmanager.Model.Institution;
import group3.en.stuattendance.Institutionmanager.Repository.InstitutionRepository;
import group3.en.stuattendance.Institutionmanager.Service.InstitutionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class InstitutionServiceImpl implements InstitutionService {

    @Autowired
    private InstitutionRepository institutionRepository;

    @Override
    @Auditable(action = "INSTITUTION_SAVE", category = "INSTITUTION_MANAGEMENT", severity = "INFO")
    public Institution save(Institution institution) {
        return institutionRepository.save(institution);
    }

    @Override
    public Institution findById(Integer id) {
        return institutionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Institution not found with id: " + id));
    }

    @Override
    public List<Institution> getAllInstitutions() {
        return institutionRepository.findAll();
    }

    @Override
    @Auditable(action = "INSTITUTION_DELETE", category = "INSTITUTION_MANAGEMENT", severity = "WARNING")
    public void deleteById(Integer id) {
        institutionRepository.deleteById(id);
    }
}