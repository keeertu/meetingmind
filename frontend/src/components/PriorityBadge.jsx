import { motion } from 'framer-motion';

function PriorityBadge({ relevance, large = false }) {
  const configs = {
    HIGH: {
      label: 'HIGH PRIORITY',
      bg: 'var(--high-bg)',
      color: 'var(--high)',
      border: 'var(--high-border)',
      pulse: true
    },
    MEDIUM: {
      label: 'MEDIUM PRIORITY',
      bg: 'var(--medium-bg)',
      color: 'var(--medium)',
      border: 'var(--medium-border)',
      pulse: false
    },
    LOW: {
      label: 'LOW PRIORITY',
      bg: 'var(--low-bg)',
      color: 'var(--low)',
      border: 'var(--low-border)',
      pulse: false
    }
  };

  const config = configs[relevance] || configs.LOW;

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    background: config.bg,
    color: config.color,
    border: `1px solid ${config.border}`,
    borderRadius: '9999px',
    padding: large ? '8px 20px' : '6px 12px',
    fontSize: large ? '13px' : '11px',
    fontFamily: 'Fraunces',
    fontWeight: 600,
    textTransform: 'uppercase'
  };

  if (config.pulse) {
    return (
      <motion.div
        style={badgeStyle}
        animate={{
          boxShadow: [
            '0 0 0px var(--high-bg)',
            '0 0 20px rgba(255, 107, 107, 0.3)',
            '0 0 0px var(--high-bg)'
          ]
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      >
        {config.label}
      </motion.div>
    );
  }

  return <div style={badgeStyle}>{config.label}</div>;
}

export default PriorityBadge;
