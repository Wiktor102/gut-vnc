import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Student } from "@shared/types";

interface ConnectionState {
	isConnected: boolean;
	isConnecting: boolean;
	error: string | null;
	students: Student[];
	teacherInfo: {
		id: string;
		name: string;
		roomName: string;
	} | null;
}

interface ConnectionContextType extends ConnectionState {
	setConnected: (connected: boolean) => void;
	setConnecting: (connecting: boolean) => void;
	setError: (error: string | null) => void;
	setStudents: (students: Student[]) => void;
	addStudent: (student: Student) => void;
	removeStudent: (studentId: string) => void;
	updateStudent: (studentId: string, updates: Partial<Student>) => void;
	setTeacherInfo: (info: ConnectionState["teacherInfo"]) => void;
	reset: () => void;
}

const initialState: ConnectionState = {
	isConnected: false,
	isConnecting: false,
	error: null,
	students: [],
	teacherInfo: null
};

const ConnectionContext = createContext<ConnectionContextType | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<ConnectionState>(initialState);

	const setConnected = useCallback((connected: boolean) => {
		setState(prev => ({ ...prev, isConnected: connected, isConnecting: false }));
	}, []);

	const setConnecting = useCallback((connecting: boolean) => {
		setState(prev => ({ ...prev, isConnecting: connecting, error: null }));
	}, []);

	const setError = useCallback((error: string | null) => {
		setState(prev => ({ ...prev, error, isConnecting: false }));
	}, []);

	const setStudents = useCallback((students: Student[]) => {
		setState(prev => ({ ...prev, students }));
	}, []);

	const addStudent = useCallback((student: Student) => {
		setState(prev => ({
			...prev,
			students: [...prev.students.filter(s => s.id !== student.id), student]
		}));
	}, []);

	const removeStudent = useCallback((studentId: string) => {
		setState(prev => ({
			...prev,
			students: prev.students.filter(s => s.id !== studentId)
		}));
	}, []);

	const updateStudent = useCallback((studentId: string, updates: Partial<Student>) => {
		setState(prev => ({
			...prev,
			students: prev.students.map(s => (s.id === studentId ? { ...s, ...updates } : s))
		}));
	}, []);

	const setTeacherInfo = useCallback((info: ConnectionState["teacherInfo"]) => {
		setState(prev => ({ ...prev, teacherInfo: info }));
	}, []);

	const reset = useCallback(() => {
		setState(initialState);
	}, []);

	// Setup IPC listeners for teacher
	useEffect(() => {
		const cleanupJoined = window.electronAPI.onStudentJoined(student => {
			addStudent(student as Student);
		});

		const cleanupLeft = window.electronAPI.onStudentLeft(studentId => {
			removeStudent(studentId);
		});

		return () => {
			cleanupJoined();
			cleanupLeft();
		};
	}, [addStudent, removeStudent]);

	const value: ConnectionContextType = {
		...state,
		setConnected,
		setConnecting,
		setError,
		setStudents,
		addStudent,
		removeStudent,
		updateStudent,
		setTeacherInfo,
		reset
	};

	return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

export function useConnection(): ConnectionContextType {
	const context = useContext(ConnectionContext);
	if (!context) {
		throw new Error("useConnection must be used within a ConnectionProvider");
	}
	return context;
}
