import React, { useEffect } from 'react';

// Animated "aurora" blobs + subtle twinkling stars for a premium LLM background
export default function ShootingStars() {
	useEffect(() => {
		const css = `
.llm-bg-aurora {
	position: fixed;
	inset: 0;
	width: 100vw;
	height: 100vh;
	overflow: hidden;
	pointer-events: none;
	z-index: 0;
}
.llm-bg-aurora .aurora-blob {
	position: absolute;
	border-radius: 50%;
	filter: blur(60px);
	opacity: 0.32;
	mix-blend-mode: lighten;
	animation: aurora-move 18s linear infinite alternate;
}
.llm-bg-aurora .aurora-blob.b1 {
	background: radial-gradient(circle at 30% 40%, #6ee7b7 0%, #2563eb 80%);
	width: 420px; height: 340px; left: -120px; top: 10vh;
	animation-delay: 0s;
}
.llm-bg-aurora .aurora-blob.b2 {
	background: radial-gradient(circle at 70% 60%, #f472b6 0%, #a78bfa 80%);
	width: 380px; height: 320px; right: -100px; top: 30vh;
	animation-delay: 3s;
}
.llm-bg-aurora .aurora-blob.b3 {
	background: radial-gradient(circle at 50% 50%, #facc15 0%, #f472b6 80%);
	width: 340px; height: 300px; left: 35vw; bottom: -80px;
	animation-delay: 7s;
}
@keyframes aurora-move {
	0% { transform: scale(1) translateY(0px) rotate(0deg);}
	100% { transform: scale(1.12) translateY(-40px) rotate(12deg);}
}
.llm-bg-aurora .twinkle {
	position: absolute;
	width: 2.5px; height: 2.5px;
	border-radius: 50%;
	background: #fff;
	opacity: 0.7;
	animation: twinkle 2.5s infinite alternate;
}
.llm-bg-aurora .twinkle.t1 { left: 18vw; top: 22vh; animation-delay: 0.2s;}
.llm-bg-aurora .twinkle.t2 { left: 62vw; top: 12vh; animation-delay: 1.1s;}
.llm-bg-aurora .twinkle.t3 { left: 44vw; top: 68vh; animation-delay: 0.7s;}
.llm-bg-aurora .twinkle.t4 { left: 80vw; top: 38vh; animation-delay: 1.7s;}
.llm-bg-aurora .twinkle.t5 { left: 12vw; top: 74vh; animation-delay: 2.1s;}
@keyframes twinkle {
	0% { opacity: 0.7; }
	50% { opacity: 0.2; }
	100% { opacity: 0.8; }
}
@media (max-width: 640px) {
	.llm-bg-aurora .aurora-blob { filter: blur(40px); opacity: 0.22; }
	.llm-bg-aurora .aurora-blob.b1 { width: 220px; height: 160px; left: -60px; top: 8vh;}
	.llm-bg-aurora .aurora-blob.b2 { width: 180px; height: 140px; right: -40px; top: 32vh;}
	.llm-bg-aurora .aurora-blob.b3 { width: 140px; height: 120px; left: 40vw; bottom: -40px;}
}
		`;
		const s = document.createElement('style');
		s.setAttribute('data-llm-bg-aurora', '1');
		s.textContent = css;
		document.head.appendChild(s);
		return () => document.head.removeChild(s);
	}, []);

	return (
		<div className="llm-bg-aurora" aria-hidden="true">
			<div className="aurora-blob b1" />
			<div className="aurora-blob b2" />
			<div className="aurora-blob b3" />
			<div className="twinkle t1" />
			<div className="twinkle t2" />
			<div className="twinkle t3" />
			<div className="twinkle t4" />
			<div className="twinkle t5" />
		</div>
	);
}
