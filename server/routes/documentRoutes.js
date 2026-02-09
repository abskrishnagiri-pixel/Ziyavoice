const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

module.exports = (mysqlPool) => {
    // Get documents for a user
    router.get('/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const { agentId } = req.query;

            let query = 'SELECT * FROM documents WHERE user_id = ?';
            const params = [userId];

            if (agentId) {
                query += ' AND (agent_id = ? OR agent_id IS NULL)';
                params.push(agentId);
            }

            query += ' ORDER BY uploaded_at DESC';

            const [documents] = await mysqlPool.execute(query, params);

            res.json({
                success: true,
                data: documents
            });
        } catch (error) {
            console.error('Error fetching documents:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Upload a new document
    router.post('/upload', async (req, res) => {
        try {
            const { userId, agentId, name, content } = req.body;

            if (!userId || !name || !content) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID, file name, and content are required'
                });
            }

            const docId = uuidv4();

            await mysqlPool.execute(
                `INSERT INTO documents (id, user_id, agent_id, name, content, uploaded_at) 
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [docId, userId, agentId || null, name, content]
            );

            res.json({
                success: true,
                data: {
                    id: docId,
                    name,
                    agentId,
                    uploadedAt: new Date()
                }
            });
        } catch (error) {
            console.error('Error uploading document:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Get document content
    router.get('/content/:docId', async (req, res) => {
        try {
            const { docId } = req.params;

            const [rows] = await mysqlPool.execute(
                'SELECT content FROM documents WHERE id = ?',
                [docId]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Document not found'
                });
            }

            res.json({
                success: true,
                data: {
                    content: rows[0].content
                }
            });
        } catch (error) {
            console.error('Error fetching document content:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Delete a document
    router.delete('/:docId', async (req, res) => {
        try {
            const { docId } = req.params;

            await mysqlPool.execute(
                'DELETE FROM documents WHERE id = ?',
                [docId]
            );

            res.json({
                success: true,
                message: 'Document deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting document:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    return router;
};
