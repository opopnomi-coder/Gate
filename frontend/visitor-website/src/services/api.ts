import { Department, Staff, VisitorRegistration, VisitorResponse } from '../types';

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'https://ritgate-backend.onrender.com/api';

export const api = {
  // Get all departments (using hardcoded list since departments are predefined)
  getDepartments: async (): Promise<Department[]> => {
    // Return hardcoded departments list
    return Promise.resolve([
      { id: 1, name: 'Computer Science & Engineering' },
      { id: 2, name: 'Electronics & Communication' },
      { id: 3, name: 'Information Technology' },
      { id: 4, name: 'AI & Data Science' },
      { id: 5, name: 'Mechanical Engineering' },
      { id: 6, name: 'Civil Engineering' },
      { id: 7, name: 'Administration' },
      { id: 8, name: 'Library' },
      { id: 9, name: 'Other' }
    ]);
  },

  // Get staff by department name
  getStaffByDepartment: async (departmentName: string): Promise<Staff[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/staff/by-department/${encodeURIComponent(departmentName)}`);
      if (!response.ok) throw new Error('Failed to fetch staff');
      return response.json();
    } catch (error) {
      console.error('Error fetching staff:', error);
      throw error;
    }
  },

  // Register a new visitor
  registerVisitor: async (visitor: VisitorRegistration): Promise<VisitorResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/visitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(visitor),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to register visitor: ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error registering visitor:', error);
      throw error;
    }
  },

  // Get all visitors
  getVisitors: async (): Promise<VisitorResponse[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/visitors`);
      if (!response.ok) throw new Error('Failed to fetch visitors');
      return response.json();
    } catch (error) {
      console.error('Error fetching visitors:', error);
      throw error;
    }
  },

  // Get visitor by ID
  getVisitorById: async (id: number): Promise<VisitorResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/visitors/${id}`);
      if (!response.ok) throw new Error('Failed to fetch visitor');
      return response.json();
    } catch (error) {
      console.error('Error fetching visitor:', error);
      throw error;
    }
  },
};
