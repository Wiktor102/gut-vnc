import { useNavigate } from "react-router-dom";
import { UserRole } from "@shared/types";
import { PL } from "@shared/constants";
import "./RoleSelect.scss";

interface RoleSelectProps {}

function RoleSelect(props: RoleSelectProps) {
	const navigate = useNavigate();

	const handleSelectRole = (role: UserRole) => {
		sessionStorage.setItem("userRole", role);
		navigate(`/${role}`);
	};
	return (
		<div className="role-select">
			<div className="role-select__container">
				<div className="role-select__header">
					<h1 className="role-select__title">{PL.appName}</h1>
					<p className="role-select__subtitle">{PL.selectRole}</p>
				</div>

				<div className="role-select__options">
					<button className="role-select__option role-select__option--teacher" onClick={() => handleSelectRole("teacher")}>
						<div className="role-select__option-icon">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
								<circle cx="9" cy="7" r="4" />
								<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
								<path d="M16 3.13a4 4 0 0 1 0 7.75" />
							</svg>
						</div>
						<div className="role-select__option-content">
							<h2 className="role-select__option-title">{PL.teacher}</h2>
							<p className="role-select__option-desc">{PL.teacherDesc}</p>
						</div>
						<div className="role-select__option-arrow">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M9 18l6-6-6-6" />
							</svg>
						</div>
					</button>

					<button className="role-select__option role-select__option--student" onClick={() => handleSelectRole("student")}>
						<div className="role-select__option-icon">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
								<circle cx="12" cy="7" r="4" />
							</svg>
						</div>
						<div className="role-select__option-content">
							<h2 className="role-select__option-title">{PL.student}</h2>
							<p className="role-select__option-desc">{PL.studentDesc}</p>
						</div>
						<div className="role-select__option-arrow">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M9 18l6-6-6-6" />
							</svg>
						</div>
					</button>
				</div>

				<div className="role-select__footer">
					<p className="role-select__version">v1.0.0</p>
				</div>
			</div>
		</div>
	);
}

export default RoleSelect;
