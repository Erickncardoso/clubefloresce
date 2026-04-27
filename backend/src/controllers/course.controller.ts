import { Request, Response } from "express";
import { CourseService } from "../services/course.service";

const courseService = new CourseService();

export class CourseController {
  async getAll(req: Request, res: Response): Promise<any> {
    try {
      const courses = await courseService.getAllCourses();
      return res.json(courses);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async getById(req: Request, res: Response): Promise<any> {
    try {
      const course = await courseService.getCourseById(req.params.id);
      if (!course) return res.status(404).json({ message: "Curso não encontrado." });
      return res.json(course);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async getModuleById(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      const moduleData = await courseService.getModuleById(req.params.moduleId, userId);
      if (!moduleData) return res.status(404).json({ message: "Módulo não encontrado." });
      return res.json(moduleData);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async create(req: Request, res: Response): Promise<any> {
    try {
      const courseData = {
        ...req.body,
        authorId: req.user?.id,
      };
      const course = await courseService.createCourse(courseData);
      return res.status(201).json(course);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async update(req: Request, res: Response): Promise<any> {
    try {
      const course = await courseService.updateCourse(req.params.id, req.body);
      return res.json(course);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async delete(req: Request, res: Response): Promise<any> {
    try {
      await courseService.deleteCourse(req.params.id);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async addModule(req: Request, res: Response): Promise<any> {
    try {
      const module = await courseService.addModule({
        ...req.body,
        courseId: req.params.id,
      });
      return res.status(201).json(module);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async addLesson(req: Request, res: Response): Promise<any> {
    try {
      const lesson = await courseService.addLesson({
        ...req.body,
        moduleId: req.body.moduleId, // Enviado no payload
      });
      return res.status(201).json(lesson);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async deleteModule(req: Request, res: Response): Promise<any> {
    try {
      await courseService.deleteModule(req.params.moduleId);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async updateLesson(req: Request, res: Response): Promise<any> {
    try {
      const lesson = await courseService.updateLesson(req.params.lessonId, req.body);
      return res.json(lesson);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async deleteLesson(req: Request, res: Response): Promise<any> {
    try {
      await courseService.deleteLesson(req.params.lessonId);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async updateLessonProgress(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Usuário não autenticado." });
      
      const progress = await courseService.toggleProgress(userId, req.params.lessonId, req.body);
      return res.json(progress);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async getLessonComments(req: Request, res: Response): Promise<any> {
    try {
      const comments = await courseService.getLessonComments(req.params.lessonId);
      return res.json(comments);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  }

  async addLessonComment(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Usuário não autenticado." });
      
      const { content } = req.body;
      if (!content) return res.status(400).json({ message: "Conteúdo do comentário é obrigatório." });

      const comment = await courseService.addLessonComment(userId, req.params.lessonId, content);
      return res.status(201).json(comment);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async updateComment(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Usuário não autenticado." });
      
      const { content } = req.body;
      const comment = await courseService.updateComment(req.params.id, userId, content);
      return res.json(comment);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async deleteComment(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Usuário não autenticado." });
      
      await courseService.deleteComment(req.params.id, userId);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  async toggleCommentLike(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Usuário não autenticado." });
      
      const comment = await courseService.toggleCommentLike(userId, req.params.id);
      return res.json(comment);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }
}

