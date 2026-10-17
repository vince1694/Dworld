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
        // ONLY find verified campus experts who have successfully created an account AND made payment 3000 completely (isActivated: true)
        const experts = await User.find({ 
            role: { $in: ['expert', 'stylist'] }, 
            isVerified: true, 
            isActivated: true 
        }).select('-password');

        if (!experts || experts.length === 0) {
            return res.status(200).json({
                success: true,
                prompt,
                matches: [],
                message: 'No verified campus experts with complete ₦3,000 activation are currently online. Please check back shortly.'
            });
        }

        const expertIds = experts.map(exp => exp._id);
        const expertIdStrings = experts.map(exp => String(exp._id));

        // Only fetch services belonging to these active verified experts
        const services = await Service.find({
            $or: [
                { stylist_id: { $in: expertIds } },
                { stylist_id: { $in: expertIdStrings } }
            ]
        });

        if (!services || services.length === 0) {
            return res.status(200).json({
                success: true,
                prompt,
                matches: [],
                message: 'No active services found for verified campus experts.'
            });
        }

        const pLower = prompt.toLowerCase();
        const queryTerms = pLower.split(/\s+/).filter(t => t.length > 2);

        // Score Services & Match ONLY Verified Activated Experts
        const scoredServices = [];
        for (const srv of services) {
            const assignedExpert = experts.find(exp => String(exp._id) === String(srv.stylist_id));
            if (!assignedExpert) continue; // Skip any service not owned by an activated verified expert

            let score = 0;
            const text = `${srv.name} ${srv.description} ${srv.category || ''} ${srv.location || ''} ${assignedExpert.specialty || ''} ${assignedExpert.address || ''}`.toLowerCase();
            
            queryTerms.forEach(term => {
                if (text.includes(term)) score += 30;
            });

            // Domain specific matching bonuses for the 6 approved services
            if (pLower.match(/nail|manicure|pedicure|acrylic/i) && text.match(/nail|manicure|pedicure|acrylic/i)) score += 45;
            if (pLower.match(/lash|extension|eyelash|lift/i) && text.match(/lash/i)) score += 45;
            if (pLower.match(/braid|cornrow|twist/i) && text.match(/braid|cornrow/i)) score += 45;
            if (pLower.match(/wig|frontal|closure|melt/i) && text.match(/wig|frontal|closure/i)) score += 45;
            if (pLower.match(/barber|cut|haircut|fade|beard|grooming/i) && text.match(/barber|cut|fade|beard/i)) score += 45;
            if (pLower.match(/body|skin|manicure|pedicure|scrub/i) && text.match(/body|pedicure|manicure/i)) score += 45;

            const matchPercentage = Math.min(99, Math.max(72, Math.floor(score + 50)));
            const reason = `Verified specialist ${assignedExpert.name} at ${assignedExpert.address || assignedExpert.location || 'Lead City University'} matches "${srv.name}" (${matchPercentage}% match).`;

            scoredServices.push({
                service: {
                    ...srv.toObject(),
                    tierLabel: '⚡ Verified Specialty',
                    expert: assignedExpert
                },
                score: matchPercentage,
                reason
            });
        }

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
