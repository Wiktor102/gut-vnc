import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ConnectionProvider } from "./context/ConnectionContext";
import { ReactionsProvider } from "./context/ReactionsContext";
import RoleSelect from "./pages/RoleSelect/RoleSelect";
import TeacherDashboard from "./pages/TeacherDashboard/TeacherDashboard";
import StudentViewer from "./pages/StudentViewer/StudentViewer";

function App() {
	return (
		<ConnectionProvider>
			<ReactionsProvider>
				<MemoryRouter>
					<Routes>
						<Route path="/" element={<RoleSelect />} />
						<Route path="/teacher/*" element={<TeacherDashboard />} />
						<Route path="/student/*" element={<StudentViewer />} />
					</Routes>
				</MemoryRouter>
			</ReactionsProvider>
		</ConnectionProvider>
	);
}

export default App;
