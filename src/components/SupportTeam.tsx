import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageCircle, 
  Plus, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User,
  Search,
  Filter,
  Headphones
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supportService, SupportTicket, SupportAgent, SupportMessage } from '@/services/supportService';

const SupportTeam: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: 'general' as SupportTicket['category'],
    priority: 'medium' as SupportTicket['priority']
  });
  const { toast } = useToast();
  
  // Mock user ID - in real app, this would come from auth
  const userId = 'user_123';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const userTickets = supportService.getTickets(userId);
    const availableAgents = supportService.getAvailableAgents();
    setTickets(userTickets);
    setAgents(availableAgents);
  };

  const createTicket = () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const ticket = supportService.createTicket(
        userId,
        newTicket.subject,
        newTicket.description,
        newTicket.category,
        newTicket.priority
      );

      loadData();
      setIsCreateDialogOpen(false);
      setNewTicket({
        subject: '',
        description: '',
        category: 'general',
        priority: 'medium'
      });

      toast({
        title: "Success",
        description: "Support ticket created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create support ticket",
        variant: "destructive"
      });
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      supportService.addMessage(selectedTicket.id, userId, 'user', newMessage);
      setNewMessage('');
      loadData();
      
      // Update selected ticket
      const updatedTickets = supportService.getTickets(userId);
      const updatedTicket = updatedTickets.find(t => t.id === selectedTicket.id);
      if (updatedTicket) {
        setSelectedTicket(updatedTicket);
      }

      toast({
        title: "Message Sent",
        description: "Your message has been sent to support",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const startLiveChat = () => {
    try {
      const { chatId, agent } = supportService.startLiveChat(userId);
      
      toast({
        title: "Live Chat Started",
        description: `Connected with ${agent.name}`,
      });
      
      setIsChatDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start live chat",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: SupportTicket['status']) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'in-progress':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: SupportTicket['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = supportService.getTicketStats(userId);

  return (
    <div className="space-y-6 bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 min-h-screen p-6 rounded-xl">
      <div className="flex items-center justify-between bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <Headphones className="h-8 w-8 text-white drop-shadow-lg" />
          <div>
            <h2 className="text-3xl font-bold">📞 Support Center</h2>
            <p className="text-green-100 mt-1">Get help from our amazing team</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={startLiveChat} className="border-white/30 text-white hover:bg-white/20">
            <MessageCircle className="h-4 w-4 mr-2" />
            Live Chat
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-green-600 hover:bg-gray-100">
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Support Ticket</DialogTitle>
                <DialogDescription>
                  Describe your issue and we'll help you resolve it
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Brief description of your issue"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={newTicket.category} 
                    onValueChange={(value: SupportTicket['category']) => 
                      setNewTicket({ ...newTicket, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical Issue</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="feature">Feature Request</SelectItem>
                      <SelectItem value="bug">Bug Report</SelectItem>
                      <SelectItem value="general">General Question</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={newTicket.priority} 
                    onValueChange={(value: SupportTicket['priority']) => 
                      setNewTicket({ ...newTicket, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide detailed information about your issue"
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <Button onClick={createTicket} className="w-full">
                  Create Ticket
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Tickets</CardTitle>
            <div className="bg-blue-500 p-2 rounded-full">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-orange-100 border-yellow-200 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Open</CardTitle>
            <div className="bg-yellow-500 p-2 rounded-full">
              <Clock className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-800">{stats.open}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">In Progress</CardTitle>
            <div className="bg-purple-500 p-2 rounded-full">
              <AlertCircle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-800">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 shadow-lg hover:shadow-xl transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Resolved</CardTitle>
            <div className="bg-green-500 p-2 rounded-full">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Support Agents */}
      <Card className="bg-gradient-to-r from-teal-50 to-cyan-100 border-teal-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-teal-100 to-cyan-100 rounded-t-lg">
          <CardTitle className="text-teal-700 flex items-center gap-2">
            👥 Available Support Agents
          </CardTitle>
          <CardDescription className="text-teal-600">Our team is here to help you with style!</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center gap-3 p-4 border-2 rounded-lg bg-gradient-to-r from-white to-teal-50 border-teal-200 hover:border-teal-300 transition-all shadow-sm hover:shadow-md">
                <div className="text-3xl">{agent.avatar}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-teal-800">{agent.name}</h4>
                    <Badge 
                      variant={agent.status === 'online' ? 'default' : 'secondary'}
                      className={`text-xs ${
                        agent.status === 'online' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-400 text-white'
                      }`}
                    >
                      {agent.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-teal-600">{agent.specialties.join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tickets Section */}
      <Tabs defaultValue="tickets" className="w-full">
        <TabsList>
          <TabsTrigger value="tickets">My Tickets</TabsTrigger>
          <TabsTrigger value="chat">Live Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tickets List */}
          {filteredTickets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Support Tickets</h3>
                <p className="text-muted-foreground text-center mb-4">
                  You haven't created any support tickets yet. Need help? Create your first ticket.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  Create First Ticket
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <Card key={ticket.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(ticket.status)}
                        <div>
                          <CardTitle className="text-base">{ticket.subject}</CardTitle>
                          <CardDescription className="text-sm">
                            Created {ticket.createdAt.toLocaleDateString()} • {ticket.category}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                        <Badge variant="outline">
                          {ticket.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-3">
                      {ticket.description.length > 150 
                        ? `${ticket.description.substring(0, 150)}...` 
                        : ticket.description
                      }
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {ticket.messages.length} message{ticket.messages.length !== 1 ? 's' : ''}
                      </span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Live Chat Support</h3>
              <p className="text-muted-foreground text-center mb-4">
                Get instant help from our support team through live chat
              </p>
              <Button onClick={startLiveChat}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Start Live Chat
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ticket Detail Dialog */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getStatusIcon(selectedTicket.status)}
                {selectedTicket.subject}
              </DialogTitle>
              <DialogDescription>
                Ticket #{selectedTicket.id.slice(-8)} • Created {selectedTicket.createdAt.toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant={getPriorityColor(selectedTicket.priority)}>
                  {selectedTicket.priority} priority
                </Badge>
                <Badge variant="outline">
                  {selectedTicket.category}
                </Badge>
                <Badge variant="outline">
                  {selectedTicket.status}
                </Badge>
              </div>

              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Original Issue</h4>
                <p className="text-sm">{selectedTicket.description}</p>
              </div>

              <div className="space-y-3 max-h-60 overflow-y-auto">
                <h4 className="font-medium">Conversation</h4>
                {selectedTicket.messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex gap-3 ${message.senderType === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {message.senderType === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Headphones className="h-4 w-4" />
                      )}
                    </div>
                    <div className={`flex-1 ${message.senderType === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block p-3 rounded-lg max-w-[80%] ${
                        message.senderType === 'user' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm">{message.message}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {message.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedTicket.status !== 'closed' && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SupportTeam;