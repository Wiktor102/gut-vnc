import { useState, useCallback } from "react";
import { ConnectionProvider } from "./context/ConnectionContext";
import { ReactionsProvider } from "./context/ReactionsContext";
import RoleSelect from "./pages/RoleSelect/RoleSelect";
import TeacherDashboard from "./pages/TeacherDashboard/TeacherDashboard";
import StudentViewer from "./pages/StudentViewer/StudentViewer";
import { UserRole } from "@shared/types";

type AppPage = "role-select" | "teacher" | "student";

function App() {
	const [currentPage, setCurrentPage] = useState<AppPage>("role-select");
	const [role, setRole] = useState<UserRole | null>(null);

	const handleRoleSelect = useCallback((selectedRole: UserRole) => {
		setRole(selectedRole);
		setCurrentPage(selectedRole);
	}, []);

	const handleBack = useCallback(() => {
		setCurrentPage("role-select");
		setRole(null);
	}, []);

	const renderPage = () => {
		switch (currentPage) {
			case "teacher":
				return <TeacherDashboard onBack={handleBack} />;
			case "student":
				return <StudentViewer onBack={handleBack} />;
			default:
				return <RoleSelect onSelectRole={handleRoleSelect} />;
		}
	};

	return (
		<ConnectionProvider>
			<ReactionsProvider>{renderPage()}</ReactionsProvider>
		</ConnectionProvider>
	);
}

export default App;
