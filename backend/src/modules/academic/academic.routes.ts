import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { prisma } from '../../core/prisma.js';
import { AcademicService } from './academic.service.js';
import {
  CreateClassSchema,
  CreateSubjectSchema,
  AssignStudentClassSchema,
  CreateAssignmentSchema,
  UpdateTeacherStatusSchema,
  CreateClassInput,
  CreateSubjectInput,
  AssignStudentClassInput,
  CreateAssignmentInput,
  UpdateTeacherStatusInput
} from './academic.schemas.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requireAdmin, requireStaff } from '../../middleware/authorize.js';

export const academicRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // 1. Classes
  app.get(
    '/classes',
    {
      preHandler: [authenticate]
    },
    async (_req, reply) => {
      const classes = await AcademicService.getClasses();
      return reply.send(classes);
    }
  );

  app.post<{ Body: CreateClassInput }>(
    '/classes',
    {
      preHandler: [authenticate, requireAdmin],
      schema: { body: CreateClassSchema }
    },
    async (req, reply) => {
      const created = await AcademicService.createClass(req.body);
      return reply.status(201).send(created);
    }
  );

  app.get<{ Params: { id: string } }>(
    '/classes/:id/students',
    {
      preHandler: [authenticate, requireStaff]
    },
    async (req, reply) => {
      const students = await AcademicService.getStudentsByClass(req.params.id);
      return reply.send(students);
    }
  );

  app.post<{ Params: { id: string }; Body: { studentId: string } }>(
    '/classes/:id/students',
    {
      preHandler: [authenticate, requireAdmin]
    },
    async (req, reply) => {
      await AcademicService.assignStudentClass(req.body.studentId, req.params.id);
      const cls = await prisma.class.findUnique({ where: { id: req.params.id } });
      return reply.status(200).send(cls);
    }
  );

  // 2. Student Class Assignment & Departure
  app.put<{ Params: { id: string }; Body: AssignStudentClassInput }>(
    '/students/:id/class',
    {
      preHandler: [authenticate, requireAdmin],
      schema: { body: AssignStudentClassSchema }
    },
    async (req, reply) => {
      const updated = await AcademicService.assignStudentClass(req.params.id, req.body.classId);
      return reply.send(updated);
    }
  );

  const departureHandler = async (req: any, reply: any) => {
    const result = await AcademicService.markStudentDeparture(req.params.id);
    return reply.send(result);
  };

  app.put<{ Params: { id: string } }>(
    '/students/:id/departure',
    {
      preHandler: [authenticate, requireAdmin]
    },
    departureHandler
  );

  app.post<{ Params: { id: string } }>(
    '/students/:id/departure',
    {
      preHandler: [authenticate, requireAdmin]
    },
    departureHandler
  );

  // 3. Subjects
  app.get(
    '/subjects',
    {
      preHandler: [authenticate]
    },
    async (_req, reply) => {
      const subjects = await AcademicService.getSubjects();
      return reply.send(subjects);
    }
  );

  app.post<{ Body: CreateSubjectInput }>(
    '/subjects',
    {
      preHandler: [authenticate, requireAdmin],
      schema: { body: CreateSubjectSchema }
    },
    async (req, reply) => {
      const subject = await AcademicService.createSubject(req.body);
      return reply.status(201).send(subject);
    }
  );

  // 4. Teacher Assignments
  app.get<{ Querystring: { teacherId?: string; classId?: string; subjectId?: string } }>(
    '/assignments',
    {
      preHandler: [authenticate]
    },
    async (req, reply) => {
      const assignments = await AcademicService.getAssignments(req.query);
      return reply.send(assignments);
    }
  );

  app.post<{ Body: CreateAssignmentInput }>(
    '/assignments',
    {
      preHandler: [authenticate, requireAdmin],
      schema: { body: CreateAssignmentSchema }
    },
    async (req, reply) => {
      const assignment = await AcademicService.createAssignment(req.body);
      return reply.status(201).send(assignment);
    }
  );

  app.delete<{ Params: { id: string } }>(
    '/assignments/:id',
    {
      preHandler: [authenticate, requireAdmin]
    },
    async (req, reply) => {
      await AcademicService.removeAssignment(req.params.id);
      return reply.send({ message: 'Assignment removed successfully' });
    }
  );

  // 5. Teacher Status Management
  app.put<{ Params: { id: string }; Body: UpdateTeacherStatusInput }>(
    '/teachers/:id/status',
    {
      preHandler: [authenticate, requireAdmin],
      schema: { body: UpdateTeacherStatusSchema }
    },
    async (req, reply) => {
      const updated = await AcademicService.updateTeacherStatus(req.params.id, req.body);
      return reply.send(updated);
    }
  );
};
