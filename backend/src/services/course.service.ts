import { CourseRepository } from "../repositories/course.repository";
import { Course, Module, Lesson } from "@prisma/client";

const courseRepository = new CourseRepository();

export class CourseService {
  async getAllCourses(): Promise<Course[]> {
    return courseRepository.findAll();
  }

  async getCourseById(id: string): Promise<Course | null> {
    return courseRepository.findById(id);
  }

  async getModuleById(id: string, userId?: string): Promise<any | null> {
    return courseRepository.findModuleById(id, userId);
  }

  async toggleProgress(userId: string, lessonId: string, data: any): Promise<any> {
    return courseRepository.updateLessonProgress(userId, lessonId, data);
  }

  async createCourse(data: any): Promise<Course> {
    return courseRepository.create(data);
  }

  async updateCourse(id: string, data: any): Promise<Course> {
    return courseRepository.update(id, data);
  }

  async addModule(data: any): Promise<Module> {
    return courseRepository.createModule(data);
  }

  async addLesson(data: any): Promise<Lesson> {
    return courseRepository.createLesson(data);
  }

  async deleteCourse(id: string): Promise<Course> {
    return courseRepository.delete(id);
  }

  async deleteModule(id: string): Promise<Module> {
    return courseRepository.deleteModule(id);
  }

  async updateLesson(id: string, data: any): Promise<Lesson> {
    return courseRepository.updateLesson(id, data);
  }

  async deleteLesson(id: string): Promise<Lesson> {
    return courseRepository.deleteLesson(id);
  }

  // Lesson Comments
  async getLessonComments(lessonId: string): Promise<any[]> {
    return courseRepository.getLessonComments(lessonId);
  }

  async addLessonComment(userId: string, lessonId: string, content: string): Promise<any> {
    return courseRepository.createLessonComment(userId, lessonId, content);
  }

  async updateComment(id: string, userId: string, content: string): Promise<any> {
    return courseRepository.updateComment(id, userId, content);
  }

  async deleteComment(id: string, userId: string): Promise<any> {
    return courseRepository.deleteComment(id, userId);
  }

  async toggleCommentLike(userId: string, commentId: string): Promise<any> {
    return courseRepository.toggleCommentLike(userId, commentId);
  }
}

