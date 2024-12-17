import * as clientService from '../../services/taskmanager/clientService.js';

export const getAllClients = async (req, res) => {
    try {
        const clients = await clientService.getAllClients();
        res.status(200).json(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getClientById = async (req, res) => {
    try {
        const client = await clientService.getClientById(req.params.id);
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.status(200).json(client);
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createClient = async (req, res) => {
    try {
        const client = await clientService.createClient(req.body);
        res.status(201).json(client);
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateClient = async (req, res) => {
    try {
        const client = await clientService.updateClient(req.params.id, req.body);
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.status(200).json(client);
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const archiveClient = async (req, res) => {
    try {
        const success = await clientService.archiveClient(req.params.id);
        if (!success) {
            return res.status(404).json({ error: 'Client not found or already archived' });
        }
        res.status(200).json({ message: 'Client archived successfully' });
    } catch (error) {
        console.error('Error archiving client:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteClient = async (req, res) => {
    try {
        const success = await clientService.deleteClient(req.params.id);
        if (!success) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.status(200).json({ message: 'Client deleted successfully' });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
