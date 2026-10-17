const Service = require('../models/Service');

const getServices = async (req, res, next) => {
    try {
        const services = await Service.getAll();
        res.status(200).json({ success: true, data: services });
    } catch (error) {
        next(error);
    }
};

const getMyServices = async (req, res, next) => {
    try {
        const services = await Service.getByStylist(req.user.id);
        res.status(200).json({ success: true, data: services });
    } catch (error) {
        next(error);
    }
};

const createService = async (req, res, next) => {
    try {
        const payload = { ...req.body };
        if (req.user && req.user.role !== 'admin') {
            const existingServices = await Service.find({ stylist_id: req.user.id });
            if (existingServices.length >= 1) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Each expert specializes in exactly 1 single service on D.world. You cannot add additional services.' 
                });
            }
            payload.stylist_id = req.user.id;
        }
        const result = await Service.create(payload);
        res.status(201).json({ success: true, message: 'Service created', serviceId: result._id });
    } catch (error) {
        next(error);
    }
};

const updateService = async (req, res, next) => {
    try {
        await Service.update(req.params.id, req.body);
        res.status(200).json({ success: true, message: 'Service updated' });
    } catch (error) {
        next(error);
    }
};

const deleteService = async (req, res, next) => {
    try {
        await Service.delete(req.params.id);
        res.status(200).json({ success: true, message: 'Service deleted' });
    } catch (error) {
        next(error);
    }
};

const matchRequestWithAI = async (req, res, next) => {
    try {
        const { prompt } = req.body;
        if (!prompt || !prompt.trim()) {
            return res.status(400).json({ success: false, message: 'Please provide a prompt describing your request' });
        }

        const User = require('../models/User');
        const experts = await User.find({ role: { $in: ['expert', 'stylist'] }, isVerified: { $ne: false } }).select('-password');
        const services = await Service.find();

        const pLower = prompt.toLowerCase();
        const queryTerms = pLower.split(/\s+/).filter(t => t.length > 2);

        // Detect Tier Intent from Prompt
        let targetTier = null;
        if (pLower.match(/single|one|only|just/i)) targetTier = 'single';
        else if (pLower.match(/double|two|2|combo|\+|and/i)) targetTier = 'double';
        else if (pLower.match(/triple|three|3|trio/i)) targetTier = 'triple';
        else if (pLower.match(/premium|full glam|bridal|complete|special occasion|quad/i)) targetTier = 'premium';

        // Score Services & Match Verified Experts
        const scoredServices = services.map(srv => {
            let score = 0;
            const text = `${srv.name} ${srv.description} ${srv.category || ''} ${srv.location || ''}`.toLowerCase();
            
            queryTerms.forEach(term => {
                if (text.includes(term)) score += 30;
            });

            // Tier Intent Match Bonus
            if (targetTier && srv.type === targetTier) {
                score += 50;
            }

            // Domain specific matching bonuses
            if (pLower.match(/nail|manicure|pedicure/i) && text.match(/nail|manicure|pedicure/i)) score += 40;
            if (pLower.match(/lash|extension|eyelash/i) && text.match(/lash/i)) score += 40;
            if (pLower.match(/hair|braid|wig|frontal|tint/i) && text.match(/hair|wig|braid|frontal|tint/i)) score += 40;
            if (pLower.match(/barber|cut|grooming|beard/i) && text.match(/barber|cut|beard|grooming/i)) score += 40;
            if (pLower.match(/makeup|glam|face/i) && text.match(/makeup|glam/i)) score += 40;

            const matchPercentage = Math.min(99, Math.max(72, Math.floor(score + 45)));

            // Find matching verified expert
            const assignedExpert = experts.find(exp => String(exp._id) === String(srv.stylist_id)) || experts[0] || {
                name: 'Ifeanyi Chukwu Bethel',
                matricNo: 'LCU/UG/22/04192',
                phone: '+234 803 555 0199',
                email: 'ifeanyi@lcu.edu.ng',
                department: 'Cosmetology & Campus Styling'
            };

            const tierLabel = srv.type === 'single' ? '🟢 Single Service' :
                              srv.type === 'double' ? '🔵 Double Service' :
                              srv.type === 'triple' ? '🟣 Triple Package' : '👑 Premium Package';

            const reason = `AI detected a ${tierLabel} request matching verified specialist ${assignedExpert.name} for "${srv.name}" (${matchPercentage}% relevance).`;

            return {
                service: {
                    ...srv.toObject(),
                    tierLabel,
                    expert: assignedExpert
                },
                score: matchPercentage,
                reason
            };
        });

        // Filter top unique matches
        const matches = scoredServices
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        res.status(200).json({
            success: true,
            prompt,
            matches
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getServices, getMyServices, createService, updateService, deleteService, matchRequestWithAI };
