export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'feature' | 'bug' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  messages: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'user' | 'support';
  message: string;
  timestamp: Date;
  attachments?: string[];
}

export interface SupportAgent {
  id: string;
  name: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy';
  specialties: string[];
}

class SupportService {
  private ticketsKey = 'browser_automation_support_tickets';
  private agentsKey = 'browser_automation_support_agents';

  // Mock support agents
  private mockAgents: SupportAgent[] = [
    {
      id: 'agent_1',
      name: 'Alex Johnson',
      email: 'alex@support.com',
      avatar: '👨‍💻',
      status: 'online',
      specialties: ['Browser Automation', 'Technical Issues']
    },
    {
      id: 'agent_2',
      name: 'Sarah Chen',
      email: 'sarah@support.com',
      avatar: '👩‍💻',
      status: 'online',
      specialties: ['Billing', 'Account Management']
    },
    {
      id: 'agent_3',
      name: 'Mike Rodriguez',
      email: 'mike@support.com',
      avatar: '👨‍🔧',
      status: 'busy',
      specialties: ['Device Profiles', 'Configuration']
    }
  ];

  createTicket(
    userId: string,
    subject: string,
    description: string,
    category: SupportTicket['category'],
    priority: SupportTicket['priority'] = 'medium'
  ): SupportTicket {
    const ticket: SupportTicket = {
      id: `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      subject,
      description,
      category,
      priority,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: []
    };

    // Add initial message
    const initialMessage: SupportMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ticketId: ticket.id,
      senderId: userId,
      senderType: 'user',
      message: description,
      timestamp: new Date()
    };

    ticket.messages.push(initialMessage);

    const tickets = this.getTickets();
    tickets.push(ticket);
    this.saveTickets(tickets);

    // Auto-assign agent based on category
    this.autoAssignAgent(ticket);

    return ticket;
  }

  getTickets(userId?: string): SupportTicket[] {
    const stored = localStorage.getItem(this.ticketsKey);
    const tickets = stored ? JSON.parse(stored) : [];
    const parsedTickets = tickets.map((t: any) => ({
      ...t,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
      messages: t.messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }))
    }));

    return userId ? parsedTickets.filter((t: SupportTicket) => t.userId === userId) : parsedTickets;
  }

  private saveTickets(tickets: SupportTicket[]): void {
    localStorage.setItem(this.ticketsKey, JSON.stringify(tickets));
  }

  addMessage(ticketId: string, senderId: string, senderType: 'user' | 'support', message: string): void {
    const tickets = this.getTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    
    if (ticket) {
      const newMessage: SupportMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ticketId,
        senderId,
        senderType,
        message,
        timestamp: new Date()
      };

      ticket.messages.push(newMessage);
      ticket.updatedAt = new Date();
      
      if (senderType === 'support' && ticket.status === 'open') {
        ticket.status = 'in-progress';
      }

      this.saveTickets(tickets);
    }
  }

  updateTicketStatus(ticketId: string, status: SupportTicket['status']): void {
    const tickets = this.getTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    
    if (ticket) {
      ticket.status = status;
      ticket.updatedAt = new Date();
      this.saveTickets(tickets);
    }
  }

  getAvailableAgents(): SupportAgent[] {
    return this.mockAgents;
  }

  private autoAssignAgent(ticket: SupportTicket): void {
    // Simple auto-assignment logic based on category and agent availability
    const availableAgents = this.mockAgents.filter(agent => agent.status === 'online');
    
    if (availableAgents.length === 0) return;

    let assignedAgent: SupportAgent;

    switch (ticket.category) {
      case 'technical':
      case 'bug':
        assignedAgent = availableAgents.find(agent => 
          agent.specialties.includes('Browser Automation') || 
          agent.specialties.includes('Technical Issues')
        ) || availableAgents[0];
        break;
      case 'billing':
        assignedAgent = availableAgents.find(agent => 
          agent.specialties.includes('Billing')
        ) || availableAgents[0];
        break;
      default:
        assignedAgent = availableAgents[0];
    }

    // Simulate agent response after a delay
    setTimeout(() => {
      const responses = [
        "Thank you for contacting support. I've received your ticket and will assist you shortly.",
        "Hello! I'm looking into your issue now. I'll get back to you with a solution as soon as possible.",
        "Thanks for reaching out. I've reviewed your request and will help resolve this for you.",
        "Hi there! I've received your support request. Let me investigate this issue for you."
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      this.addMessage(ticket.id, assignedAgent.id, 'support', randomResponse);
    }, 2000 + Math.random() * 3000); // Random delay between 2-5 seconds
  }

  searchTickets(query: string, userId?: string): SupportTicket[] {
    const tickets = this.getTickets(userId);
    const lowercaseQuery = query.toLowerCase();
    
    return tickets.filter(ticket => 
      ticket.subject.toLowerCase().includes(lowercaseQuery) ||
      ticket.description.toLowerCase().includes(lowercaseQuery) ||
      ticket.messages.some(msg => msg.message.toLowerCase().includes(lowercaseQuery))
    );
  }

  getTicketStats(userId?: string): {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  } {
    const tickets = this.getTickets(userId);
    
    return {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in-progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length
    };
  }

  deleteTicket(ticketId: string): void {
    const tickets = this.getTickets().filter(t => t.id !== ticketId);
    this.saveTickets(tickets);
  }

  // Live chat simulation
  startLiveChat(userId: string): { chatId: string; agent: SupportAgent } {
    const availableAgents = this.mockAgents.filter(agent => agent.status === 'online');
    const agent = availableAgents[Math.floor(Math.random() * availableAgents.length)] || this.mockAgents[0];
    
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return { chatId, agent };
  }
}

export const supportService = new SupportService();