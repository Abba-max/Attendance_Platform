package group3.en.stuattendance.Institutionmanager.Service.Impl;

import group3.en.stuattendance.Institutionmanager.DTO.ClassroomDto;
import group3.en.stuattendance.Institutionmanager.Mapper.ClassroomMapper;
import group3.en.stuattendance.Institutionmanager.Model.Classroom;
import group3.en.stuattendance.Institutionmanager.Repository.ClassroomRepository;
import group3.en.stuattendance.Institutionmanager.Service.ClassroomService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class ClassroomServiceImpl implements ClassroomService {

    private final ClassroomRepository classroomRepository;
    private final ClassroomMapper classroomMapper;

    @Override
    public Classroom save(Classroom classroom) {
        return classroomRepository.save(classroom);
    }

    @Override
    public Classroom findById(Integer id) {
        return classroomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Classroom not found with id: " + id));
    }

    @Override
    public List<ClassroomDto> getAllClassrooms() {
        return classroomRepository.findAll().stream()
                .map(classroomMapper::toDto)
                .collect(Collectors.toList());
    }


    @Override
    public List<ClassroomDto> findBySpecialityId(Integer specialityId) {
        return classroomRepository.findBySpeciality_SpecialityId(specialityId).stream()
                .map(classroomMapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public void deleteById(Integer id) {
        classroomRepository.deleteById(id);
    }
}