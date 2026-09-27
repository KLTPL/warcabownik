import torch 
import numpy as np
import os

from model import CheckersValueNet, prepare_layout_for_network
from onnxruntime.quantization import quantize_dynamic, QuantType
from onnxruntime.quantization.shape_inference import quant_pre_process

MODEL_PATH = "checkers_model.pth"
ONX_FLOAT32_MODEL_PATH = "checkers_model_float32.onnx"
ONX_INFER_MODEL_PATH = "checkers_model_infer.onnx"
FINAL_ONX_MODEL_PATH = "checkers_model.onnx"
BOARD_SIZE = 8

def export_to_onx(quantize = False):
    model = CheckersValueNet()

    if not os.path.exists(MODEL_PATH):
        print("model not found")
        return
    
    model.load_state_dict(torch.load(MODEL_PATH, map_location=torch.device('cpu'), weights_only=True))
    model.eval()

    empty_board = np.zeros((BOARD_SIZE,BOARD_SIZE), dtype=np.int8)
    one_layout_tensor = prepare_layout_for_network(empty_board)

    dummy_input = torch.stack([one_layout_tensor,one_layout_tensor])
    
    dynamic_axes_config={
        'input':{0: 'batch_size'},
        'output':{0: 'batch_size'}
    }

    export_path = ONX_FLOAT32_MODEL_PATH if quantize else FINAL_ONX_MODEL_PATH

    torch.onnx.export(
        model,
        dummy_input,
        export_path,
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes=dynamic_axes_config
    )
    

    if quantize:
        quant_pre_process(
            input_model_path = ONX_FLOAT32_MODEL_PATH,
            output_model_path = ONX_INFER_MODEL_PATH,
            skip_symbolic_shape = False
        )


        quantize_dynamic(
            model_input = ONX_INFER_MODEL_PATH,
            model_output = FINAL_ONX_MODEL_PATH,
            weight_type = QuantType.QInt8,
        )
        
        if os.path.exists(ONX_INFER_MODEL_PATH):
            os.remove(ONX_INFER_MODEL_PATH)
        """
        if os.path.exists(ONX_FLOAT32_MODEL_PATH):
            os.remove(ONX_FLOAT32_MODEL_PATH) 
        
            """
if __name__ == "__main__":
    export_to_onx(quantize=True)
    


