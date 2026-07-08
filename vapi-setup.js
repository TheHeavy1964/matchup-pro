import Vapi from '@vapi-ai/web';

// Studio Mode & Vapi Logic
document.addEventListener('DOMContentLoaded', () => {
    const studioToggle = document.getElementById('studioModeToggle');
    const studioContainer = document.getElementById('studioModeContainer');
    const welcomeContainer = document.getElementById('dashboardWelcome');
    
    const otherContainers = [
        document.getElementById('analyticsContainer'),
        document.getElementById('teamsGamesContainer'),
        document.getElementById('playersContainer')
    ];

    let isStudioMode = false;

    if (studioToggle) {
        studioToggle.addEventListener('click', () => {
            isStudioMode = !isStudioMode;
            
            if (isStudioMode) {
                studioToggle.style.background = '#2ecc71';
                studioToggle.querySelector('.pulse-dot').classList.add('active');
                if (welcomeContainer) welcomeContainer.style.display = 'none';
                otherContainers.forEach(c => { if(c) c.style.display = 'none'; });
                if (studioContainer) studioContainer.style.display = 'flex';
                if (window.innerWidth <= 1024) {
                    const lp = document.querySelector('.left-panel');
                    if (lp) lp.style.display = 'none';
                }
            } else {
                studioToggle.style.background = 'linear-gradient(45deg, #e74c3c, #c0392b)';
                studioToggle.querySelector('.pulse-dot').classList.remove('active');
                if (studioContainer) studioContainer.style.display = 'none';
                if (welcomeContainer) welcomeContainer.style.display = 'block';
                const lp = document.querySelector('.left-panel');
                if (lp) lp.style.display = 'block';
            }
        });
    }

    // Real Vapi Mic Integration
    const vapiMicBtn = document.getElementById('vapiMicBtn');
    const mockStatCard = document.getElementById('mockStatCard');
    
    // ACTION REQUIRED: Add your keys here from dashboard.vapi.ai
    const VAPI_PUBLIC_KEY = 'e57014ec-f147-4ae9-ab3b-41fb56bf5048';
    const ASSISTANT_ID = '852fe68f-bc23-484f-ba74-7e97bd291f4b';
    
    let vapiInstance = null;
    let isListening = false;

    if (typeof Vapi !== 'undefined' && VAPI_PUBLIC_KEY) {
        vapiInstance = new Vapi(VAPI_PUBLIC_KEY);
        
        vapiInstance.on('call-start', () => {
            isListening = true;
            vapiMicBtn.style.transform = 'scale(1.1)';
            vapiMicBtn.style.boxShadow = '0 0 30px rgba(16, 185, 129, 0.8)';
            vapiMicBtn.innerHTML = '<span style="font-size: 32px; color: white;">🛑</span>';
        });
        
        vapiInstance.on('call-end', () => {
            isListening = false;
            vapiMicBtn.style.transform = 'scale(1)';
            vapiMicBtn.style.boxShadow = '0 10px 30px rgba(16, 185, 129, 0.4)';
            vapiMicBtn.innerHTML = '<span style="font-size: 32px; color: white;">🎤</span>';
        });
        
        vapiInstance.on('message', (message) => {
            // Trigger UI changes when Vapi triggers our tool
            if (message.type === 'tool-calls' && mockStatCard) {
                mockStatCard.style.display = 'block';
                mockStatCard.style.animation = 'fadeInUp 0.5s ease-out';
            }
        });
    }

    if (vapiMicBtn) {
        vapiMicBtn.addEventListener('click', () => {
            if (!VAPI_PUBLIC_KEY) {
                alert("Vapi is not configured! Please create a free account at vapi.ai and add your Public Key in popup.html.");
                return;
            }
            
            if (!isListening) {
                vapiInstance.start(ASSISTANT_ID);
            } else {
                vapiInstance.stop();
            }
        });
    }
});
