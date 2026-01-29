import { useConnection } from "../../context/ConnectionContext";
import { PL } from "@shared/constants";
import "./ConnectionStatus.scss";

function ConnectionStatus() {
	const { isConnected, isConnecting, error } = useConnection();

	if (error) {
		return (
			<div className="connection-status connection-status--error">
				<span className="connection-status__dot" />
				<span className="connection-status__text">{PL.error}</span>
			</div>
		);
	}

	if (isConnecting) {
		return (
			<div className="connection-status connection-status--connecting">
				<span className="connection-status__dot connection-status__dot--pulse" />
				<span className="connection-status__text">{PL.connecting}</span>
			</div>
		);
	}

	if (isConnected) {
		return (
			<div className="connection-status connection-status--connected">
				<span className="connection-status__dot" />
				<span className="connection-status__text">{PL.connected}</span>
			</div>
		);
	}

	return (
		<div className="connection-status connection-status--disconnected">
			<span className="connection-status__dot" />
			<span className="connection-status__text">{PL.disconnected}</span>
		</div>
	);
}

export default ConnectionStatus;
