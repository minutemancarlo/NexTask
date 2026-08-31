import React from 'react';
import { QuadrantCard } from './QuadrantCard';
import { useTasks } from '../../context/TaskContext';

export const MatrixView = () => {
  const { filteredTasks } = useTasks();

  const q1Tasks = filteredTasks.filter(t => t.quadrant === 'Q1');
  const q2Tasks = filteredTasks.filter(t => t.quadrant === 'Q2');
  const q3Tasks = filteredTasks.filter(t => t.quadrant === 'Q3');
  const q4Tasks = filteredTasks.filter(t => t.quadrant === 'Q4');

  return (
    <div className="flex-1 px-3.5 sm:px-5 lg:px-6 py-4 w-full">
      {/* 2x2 Bento Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
        
        {/* Quadrant 1: Urgent & Important */}
        <QuadrantCard
          quadrantId="Q1"
          title="Q1: Do First"
          subtitle="Urgent & Important"
          description="Immediate crises & critical deadlines"
          tasks={q1Tasks}
        />

        {/* Quadrant 2: Not Urgent & Important */}
        <QuadrantCard
          quadrantId="Q2"
          title="Q2: Schedule"
          subtitle="Not Urgent, but Important"
          description="Strategic growth, deep work & planning"
          tasks={q2Tasks}
        />

        {/* Quadrant 3: Urgent & Not Important */}
        <QuadrantCard
          quadrantId="Q3"
          title="Q3: Delegate"
          subtitle="Urgent, but Not Important"
          description="Interruptions, errands & hand-offs"
          tasks={q3Tasks}
        />

        {/* Quadrant 4: Not Urgent & Not Important */}
        <QuadrantCard
          quadrantId="Q4"
          title="Q4: Eliminate"
          subtitle="Not Urgent & Not Important"
          description="Distractions & low-value noise"
          tasks={q4Tasks}
        />

      </div>
    </div>
  );
};
