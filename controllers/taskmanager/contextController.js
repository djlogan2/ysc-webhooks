import contextService from '../../services/taskmanager/contextService.js';

export const getAllContexts = async (req, res) => {
    try {
        const contexts = await contextService.getAllContexts();
        res.status(200).json(contexts);
    } catch (error) {
        console.error('Error fetching contexts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createContext = async (req, res) => {
    try {
        const { context_name } = req.body;
        const context = await contextService.createContext(context_name);
        res.status(201).json(context);
    } catch (error) {
        console.error('Error creating context:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateContext = async (req, res) => {
    try {
        const { id } = req.params;
        const { context_name } = req.body;
        const updatedContext = await contextService.updateContext(id, context_name);
        if (!updatedContext) {
            return res.status(404).json({ error: 'Context not found' });
        }
        res.status(200).json(updatedContext);
    } catch (error) {
        console.error('Error updating context:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteContext = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await contextService.deleteContext(id);
        if (!success) {
            return res.status(404).json({ error: 'Context not found' });
        }
        res.status(200).json({ message: 'Context deleted successfully' });
    } catch (error) {
        console.error('Error deleting context:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
