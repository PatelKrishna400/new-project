/**
 * Help & Support Full Page Controller
 * Handles user balances, FAQs, ticket submissions, and storage sync.
 */

(function () {
  'use strict';

  // 1. Sync Balances with localStorage
  function updateHeaderBalances() {
    try {
      const coins = parseInt(localStorage.getItem('task_game_coins') || localStorage.getItem('user_coins') || '0', 10);
      const stars = parseInt(localStorage.getItem('task_game_stars') || localStorage.getItem('user_stars') || '0', 10);

      const coinEl = document.getElementById('helpBalanceTop');
      const starEl = document.getElementById('helpStarsTop');

      if (coinEl) {
        coinEl.textContent = Number.isFinite(coins) ? coins.toLocaleString() : '0';
      }
      if (starEl) {
        starEl.textContent = Number.isFinite(stars) ? stars.toLocaleString() : '0';
      }
    } catch (e) {
      console.warn('Error reading balances:', e);
    }
  }

  // 2. Render Submitted User Support Tickets
  function renderUserTickets() {
    const listEl = document.getElementById('userTicketsList');
    const wrapEl = document.getElementById('userTicketsWrap');
    if (!listEl || !wrapEl) return;

    try {
      const raw = localStorage.getItem('user_support_tickets');
      const tickets = raw ? JSON.parse(raw) : [];

      if (!Array.isArray(tickets) || tickets.length === 0) {
        wrapEl.style.display = 'none';
        listEl.innerHTML = '';
        return;
      }

      wrapEl.style.display = 'block';
      listEl.innerHTML = tickets.slice(-5).reverse().map(ticket => `
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 0.65rem 0.85rem; margin-bottom: 0.5rem; text-align: left;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <span style="font-weight: 800; color: #38bdf8; font-size: 0.8rem; letter-spacing: 0.5px;">Ticket #${ticket.id || 'NV-0000'}</span>
            <span style="background: rgba(234, 179, 8, 0.15); color: #facc15; font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 999px;">${ticket.status || 'Pending Review'}</span>
          </div>
          <div style="font-size: 0.76rem; color: #cbd5e1; word-break: break-word; line-height: 1.35;">${escapeHtml(ticket.message || '')}</div>
          <div style="font-size: 0.65rem; color: #64748b; margin-top: 0.25rem;">Submitted on: ${ticket.date || new Date().toLocaleDateString()}</div>
        </div>
      `).join('');
    } catch (err) {
      console.warn('Error rendering user tickets:', err);
    }
  }

  // Helper HTML escaper
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 3. Handle Ticket Submission
  window.handleTicketSubmit = function (event) {
    if (event && event.preventDefault) event.preventDefault();

    const textarea = document.getElementById('helpTicketMessage');
    const statusMsg = document.getElementById('helpTicketStatusMsg');
    const submitBtn = document.getElementById('btnSubmitTicket');

    if (!textarea) return;
    const message = textarea.value.trim();

    if (!message) {
      if (statusMsg) {
        statusMsg.style.display = 'block';
        statusMsg.style.color = '#f87171';
        statusMsg.style.background = 'rgba(239, 68, 68, 0.15)';
        statusMsg.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        statusMsg.textContent = 'Please enter your message before sending.';
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.6';
    }

    // Generate clean ticket ID
    const ticketId = 'NV-' + Math.floor(1000 + Math.random() * 9000);
    const newTicket = {
      id: ticketId,
      message: message,
      status: 'Submitted (Reviewing)',
      date: new Date().toLocaleString()
    };

    try {
      const raw = localStorage.getItem('user_support_tickets');
      const tickets = raw ? JSON.parse(raw) : [];
      tickets.push(newTicket);
      localStorage.setItem('user_support_tickets', JSON.stringify(tickets));
    } catch (err) {
      console.warn('Failed saving ticket locally:', err);
    }

    // Clear textarea
    textarea.value = '';

    // Show success alert
    if (statusMsg) {
      statusMsg.style.display = 'block';
      statusMsg.style.color = '#4ade80';
      statusMsg.style.background = 'rgba(74, 222, 128, 0.15)';
      statusMsg.style.border = '1px solid rgba(74, 222, 128, 0.3)';
      statusMsg.textContent = `Ticket #${ticketId} submitted successfully! We will review it shortly.`;
    }

    // Refresh tickets list
    renderUserTickets();

    setTimeout(() => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
      }
    }, 1000);
  };

  // 4. Listeners & Initialization
  document.addEventListener('DOMContentLoaded', function () {
    updateHeaderBalances();
    renderUserTickets();

    // BroadcastChannel sync across tabs/pages
    try {
      const channel = new BroadcastChannel('game_state_sync');
      channel.onmessage = function () {
        updateHeaderBalances();
      };
    } catch (e) {
      // BroadcastChannel unsupported fallback
    }

    window.addEventListener('storage', function (e) {
      if (e.key === 'task_game_coins' || e.key === 'task_game_stars' || e.key === 'user_coins' || e.key === 'user_stars') {
        updateHeaderBalances();
      }
    });
  });

})();

