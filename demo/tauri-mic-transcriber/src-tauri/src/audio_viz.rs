use rustfft::num_complex::Complex;
use rustfft::FftPlanner;
use std::sync::Mutex;

pub struct AudioVisualizer {
    planner: Mutex<FftPlanner<f32>>,
}

impl Default for AudioVisualizer {
    fn default() -> Self {
        Self {
            planner: Mutex::new(FftPlanner::new()),
        }
    }
}

impl AudioVisualizer {
    pub fn new() -> Self {
        Self::default()
    }

    /// Computes 16 log-spaced frequency energy buckets normalized to 0.0..1.0
    /// from input PCM audio samples.
    pub fn compute_buckets(&self, pcm: &[f32]) -> [f32; 16] {
        let mut buckets = [0.0f32; 16];
        if pcm.is_empty() {
            return buckets;
        }

        let n = 512;
        let mut buffer: Vec<Complex<f32>> = Vec::with_capacity(n);

        for (i, &sample) in pcm.iter().take(n).enumerate() {
            let window = 0.5 * (1.0 - (2.0 * std::f32::consts::PI * i as f32 / n as f32).cos());
            buffer.push(Complex::new(sample * window, 0.0));
        }

        while buffer.len() < n {
            buffer.push(Complex::new(0.0, 0.0));
        }

        let mut planner = self.planner.lock().unwrap_or_else(|p| p.into_inner());
        let fft = planner.plan_fft_forward(n);
        fft.process(&mut buffer);

        let half_n = n / 2;
        let db_min = -68.0f32;
        let db_max = -20.0f32;

        for (b, slot) in buckets.iter_mut().enumerate() {
            let start_bin =
                ((half_n as f32) * (2.0f32.powf(b as f32 / 16.0) - 1.0) / (2.0f32 - 1.0)) as usize;
            let end_bin = (((half_n as f32) * (2.0f32.powf((b + 1) as f32 / 16.0) - 1.0)
                / (2.0f32 - 1.0)) as usize)
                .max(start_bin + 1);

            let mut sum_mag = 0.0f32;
            let mut count = 0;

            for item in buffer.iter().take(end_bin.min(half_n)).skip(start_bin) {
                let mag = item.norm();
                sum_mag += mag;
                count += 1;
            }

            let avg_mag = if count > 0 {
                sum_mag / count as f32
            } else {
                0.0
            };
            let db = 20.0 * (avg_mag + 1e-6).log10();
            let norm = ((db - db_min) / (db_max - db_min)).clamp(0.0, 1.0);
            *slot = norm;
        }

        buckets
    }
}
