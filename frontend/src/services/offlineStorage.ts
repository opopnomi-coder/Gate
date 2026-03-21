import AsyncStorage from '@react-native-async-storage/async-storage';
import { Student, Staff, HOD, HR, SecurityPersonnel, EntryLog } from '../types';

const STORAGE_KEYS = {
  CURRENT_STUDENT: 'current_student',
  CURRENT_STAFF: 'current_staff',
  CURRENT_HOD: 'current_hod',
  CURRENT_HR: 'current_hr',
  CURRENT_SECURITY: 'current_security',
  ENTRY_LOGS: 'entry_logs_',
  APP_SETTINGS: 'app_settings',
};

class OfflineStorageService {
  // Student Management
  async saveCurrentStudent(student: Student): Promise<void> {
    return this.storeStudentData(student);
  }

  async storeStudentData(student: Student): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT, JSON.stringify(student));
    } catch (error) {
      console.error('Error storing student data:', error);
      throw error;
    }
  }

  async getCurrentStudent(): Promise<Student | null> {
    try {
      const studentData = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_STUDENT);
      return studentData ? JSON.parse(studentData) : null;
    } catch (error) {
      console.error('Error getting current student:', error);
      return null;
    }
  }

  async getStudentData(regNo: string): Promise<Student | null> {
    try {
      const currentStudent = await this.getCurrentStudent();
      return currentStudent && currentStudent.regNo === regNo ? currentStudent : null;
    } catch (error) {
      console.error('Error getting student data:', error);
      return null;
    }
  }

  async clearCurrentStudent(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_STUDENT);
    } catch (error) {
      console.error('Error clearing current student:', error);
      throw error;
    }
  }

  // Staff Management
  async storeStaffData(staff: Staff): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_STAFF, JSON.stringify(staff));
    } catch (error) {
      console.error('Error storing staff data:', error);
      throw error;
    }
  }

  async getCurrentStaff(): Promise<Staff | null> {
    try {
      const staffData = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_STAFF);
      return staffData ? JSON.parse(staffData) : null;
    } catch (error) {
      console.error('Error getting current staff:', error);
      return null;
    }
  }

  async getStaffData(staffCode: string): Promise<Staff | null> {
    try {
      const currentStaff = await this.getCurrentStaff();
      return currentStaff && currentStaff.staffCode === staffCode ? currentStaff : null;
    } catch (error) {
      console.error('Error getting staff data:', error);
      return null;
    }
  }

  async clearCurrentStaff(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_STAFF);
    } catch (error) {
      console.error('Error clearing current staff:', error);
      throw error;
    }
  }

  // HOD Management
  async saveCurrentHOD(hod: HOD): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_HOD, JSON.stringify(hod));
      console.log('✅ HOD session saved:', hod.hodCode);
    } catch (error) {
      console.error('Error storing HOD data:', error);
      throw error;
    }
  }

  async getCurrentHOD(): Promise<HOD | null> {
    try {
      const hodData = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_HOD);
      return hodData ? JSON.parse(hodData) : null;
    } catch (error) {
      console.error('Error getting current HOD:', error);
      return null;
    }
  }

  async clearCurrentHOD(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_HOD);
    } catch (error) {
      console.error('Error clearing current HOD:', error);
      throw error;
    }
  }

  // HR Management
  async saveCurrentHR(hr: HR): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_HR, JSON.stringify(hr));
      console.log('✅ HR session saved:', hr.hrCode);
    } catch (error) {
      console.error('Error storing HR data:', error);
      throw error;
    }
  }

  async getCurrentHR(): Promise<HR | null> {
    try {
      const hrData = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_HR);
      return hrData ? JSON.parse(hrData) : null;
    } catch (error) {
      console.error('Error getting current HR:', error);
      return null;
    }
  }

  async clearCurrentHR(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_HR);
    } catch (error) {
      console.error('Error clearing current HR:', error);
      throw error;
    }
  }

  // Security Management
  async saveCurrentSecurity(security: SecurityPersonnel): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SECURITY, JSON.stringify(security));
      console.log('✅ Security session saved:', security.securityId);
    } catch (error) {
      console.error('Error storing Security data:', error);
      throw error;
    }
  }

  async getCurrentSecurity(): Promise<SecurityPersonnel | null> {
    try {
      const securityData = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SECURITY);
      if (!securityData) return null;
      const parsed = JSON.parse(securityData);
      // Backfill securityId from userId if missing (old cached sessions)
      if (!parsed.securityId && parsed.userId) {
        parsed.securityId = parsed.userId;
      }
      return parsed;
    } catch (error) {
      console.error('Error getting current Security:', error);
      return null;
    }
  }

  async clearCurrentSecurity(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_SECURITY);
    } catch (error) {
      console.error('Error clearing current Security:', error);
      throw error;
    }
  }

  // Entry Logs Management
  async storeEntryLogs(regNo: string, logs: EntryLog[]): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.ENTRY_LOGS}${regNo}`;
      await AsyncStorage.setItem(key, JSON.stringify(logs));
    } catch (error) {
      console.error('Error storing entry logs:', error);
      throw error;
    }
  }

  async getEntryLogs(regNo: string): Promise<EntryLog[]> {
    try {
      const key = `${STORAGE_KEYS.ENTRY_LOGS}${regNo}`;
      const logsData = await AsyncStorage.getItem(key);
      return logsData ? JSON.parse(logsData) : [];
    } catch (error) {
      console.error('Error getting entry logs:', error);
      return [];
    }
  }

  async addEntryLog(regNo: string, log: EntryLog): Promise<void> {
    try {
      const existingLogs = await this.getEntryLogs(regNo);
      const updatedLogs = [log, ...existingLogs];
      await this.storeEntryLogs(regNo, updatedLogs);
    } catch (error) {
      console.error('Error adding entry log:', error);
      throw error;
    }
  }

  // App Settings
  async storeAppSettings(settings: any): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error storing app settings:', error);
      throw error;
    }
  }

  async getAppSettings(): Promise<any> {
    try {
      const settingsData = await AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      return settingsData ? JSON.parse(settingsData) : {};
    } catch (error) {
      console.error('Error getting app settings:', error);
      return {};
    }
  }

  // Clear All Data
  async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }
}

export const offlineStorage = new OfflineStorageService();
