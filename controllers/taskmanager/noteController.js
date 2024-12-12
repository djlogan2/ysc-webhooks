import noteService from '../../services/taskmanager/noteService.js';

export const getNotesByTaskId = async (req, res) => {
    try {
        const { taskId } = req.params;
        const notes = await noteService.getNotesByTaskId(taskId);
        res.status(200).json(notes);
    } catch (error) {
        console.error('Error fetching notes for task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createNote = async (req, res) => {
    try {
        const { task_id, note_text } = req.body;

        // Validate input
        if (!task_id || !note_text) {
            return res.status(400).json({ error: 'Task ID and note text are required' });
        }

        const note = await noteService.createNote(task_id, note_text);
        res.status(201).json(note);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { note_text } = req.body;

        // Validate input
        if (!note_text) {
            return res.status(400).json({ error: 'Note text is required' });
        }

        const updatedNote = await noteService.updateNote(id, note_text);
        if (!updatedNote) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.status(200).json(updatedNote);
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteNote = async (req, res) => {
    try {
        const { id } = req.params;
        const success = await noteService.deleteNote(id);
        if (!success) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.status(200).json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
